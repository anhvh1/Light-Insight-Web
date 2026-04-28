import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWebRtcTokenByConnectorKey } from '@/lib/playback-api';

type SessionResponse = {
  sessionId: string;
  offerSDP: string;
};

type IceResponse = {
  candidates?: string[];
};

function parseAlarmTimeToLocalDate(value: string): Date | null {
  const matched = value.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!matched) return null;
  const [, dd, mm, yyyy, hh, min, ss] = matched;
  const localDate = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    Number(ss)
  );
  if (Number.isNaN(localDate.getTime())) return null;
  return localDate;
}

function parseAlarmTimeToIsoUtc(value: string): string {
  if (!value) return new Date().toISOString();
  const localDate = parseAlarmTimeToLocalDate(value);
  if (!localDate) {
    // Keep a safe fallback so playback can still start,
    // but prefer strict dd-MM-yyyy HH:mm:ss from backend.
    return new Date().toISOString();
  }
  return localDate.toISOString();
}

export function HiddenPlaybackPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const sentCandidatesRef = useRef<Set<string>>(new Set());
  const remoteCandidatesRef = useRef<Set<string>>(new Set());

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const connectorKey = query.get('key') ?? '';
  const cameraId = query.get('cameraId') ?? '';
  const alarmTimeRaw = query.get('alarmTime') ?? '';
  const initialPlaybackTimeIso = useMemo(
    () => parseAlarmTimeToIsoUtc(alarmTimeRaw),
    [alarmTimeRaw]
  );
  const [currentPlaybackIso, setCurrentPlaybackIso] = useState(
    initialPlaybackTimeIso
  );

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const closePeer = useCallback(() => {
    clearPollTimer();
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    sessionIdRef.current = null;
    sentCandidatesRef.current.clear();
    remoteCandidatesRef.current.clear();
  }, [clearPollTimer]);

  const pollRemoteIce = useCallback(
    async (baseWebRtcUrl: string, token: string) => {
      const sessionId = sessionIdRef.current;
      const peer = peerRef.current;
      if (!sessionId || !peer) return;
      if (
        peer.iceConnectionState !== 'new' &&
        peer.iceConnectionState !== 'checking' &&
        peer.iceConnectionState !== 'connected'
      ) {
        return;
      }

      try {
        const res = await fetch(`${baseWebRtcUrl}/IceCandidates/${sessionId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = (await res.json()) as IceResponse;
          for (const candidateText of json.candidates ?? []) {
            if (remoteCandidatesRef.current.has(candidateText)) continue;
            remoteCandidatesRef.current.add(candidateText);
            await peer.addIceCandidate(JSON.parse(candidateText));
          }
        }
      } catch (error) {
        console.warn('Unable to poll remote ICE candidates:', error);
      } finally {
        pollTimerRef.current = window.setTimeout(() => {
          void pollRemoteIce(baseWebRtcUrl, token);
        }, 250);
      }
    },
    []
  );

  const startPlayback = useCallback(
    async (targetIso: string, targetSpeed: number) => {
      if (!connectorKey || !cameraId) {
        console.warn('Playback: thiếu connector key hoặc cameraId.');
        return;
      }

      closePeer();

      try {
        const tokenData = await getWebRtcTokenByConnectorKey(connectorKey);
        if (!tokenData.baseUrl || !tokenData.bearerToken) {
          console.warn('Playback: không lấy được baseUrl/bearerToken từ API token.');
          return;
        }

        const baseWebRtcUrl = `${tokenData.baseUrl.replace(/\/$/, '')}/REST/v1/WebRTC`;
        const peer = new RTCPeerConnection();
        peerRef.current = peer;

        peer.ontrack = (event) => {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
          setPlaying(true);
        };

        peer.onconnectionstatechange = () => {
          if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
            console.warn('Playback: mất kết nối WebRTC.');
          }
        };

        peer.onicecandidate = (evt) => {
          const sessionId = sessionIdRef.current;
          if (!evt.candidate || !sessionId) return;
          const candidateText = JSON.stringify(evt.candidate);
          if (sentCandidatesRef.current.has(candidateText)) return;
          sentCandidatesRef.current.add(candidateText);
          void fetch(`${baseWebRtcUrl}/IceCandidates/${sessionId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokenData.bearerToken}`,
            },
            body: JSON.stringify({ candidates: [candidateText] }),
          });
        };

        const body = {
          cameraId,
          resolution: 'notInUse',
          playbackTimeNode: {
            playbackTime: targetIso,
            speed: targetSpeed,
            skipGaps: false,
          },
        };

        const sessionRes = await fetch(`${baseWebRtcUrl}/Session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenData.bearerToken}`,
          },
          body: JSON.stringify(body),
        });
        if (!sessionRes.ok) {
          throw new Error(`Create Session failed: ${sessionRes.status}`);
        }
        const sessionJson = (await sessionRes.json()) as SessionResponse;
        sessionIdRef.current = sessionJson.sessionId;

        await peer.setRemoteDescription(JSON.parse(sessionJson.offerSDP));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        const patchRes = await fetch(
          `${baseWebRtcUrl}/Session/${sessionJson.sessionId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokenData.bearerToken}`,
            },
            body: JSON.stringify({ answerSDP: JSON.stringify(peer.localDescription) }),
          }
        );
        if (!patchRes.ok) {
          throw new Error(`Patch Session failed: ${patchRes.status}`);
        }

        setCurrentPlaybackIso(targetIso);
        setSpeed(targetSpeed);
        void pollRemoteIce(baseWebRtcUrl, tokenData.bearerToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Playback error:', message);
        closePeer();
      }
    },
    [cameraId, closePeer, connectorKey, pollRemoteIce]
  );

  useEffect(() => {
    void startPlayback(initialPlaybackTimeIso, 1);
    return () => {
      closePeer();
    };
  }, [closePeer, initialPlaybackTimeIso, startPlayback]);

  const seekSeconds = async (seconds: number) => {
    const next = new Date(new Date(currentPlaybackIso).getTime() + seconds * 1000);
    const nextIso = next.toISOString();
    await startPlayback(nextIso, speed);
  };

  const togglePlayPause = async () => {
    if (playing) {
      closePeer();
      setPlaying(false);
      return;
    }
    await startPlayback(currentPlaybackIso, speed);
  };

  return (
    <div className="flex h-dvh w-full min-h-0 flex-col overflow-hidden bg-black text-white">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full max-h-full w-full object-contain bg-black"
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          className="px-3 py-1 rounded bg-bg3 border border-border-dim text-[11px]"
          onClick={() => void seekSeconds(-30)}
        >
          -30s
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-bg3 border border-border-dim text-[11px]"
          onClick={() => void seekSeconds(-10)}
        >
          -10s
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-psim-accent text-bg0 text-[11px] font-semibold"
          onClick={() => void togglePlayPause()}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-bg3 border border-border-dim text-[11px]"
          onClick={() => void startPlayback(currentPlaybackIso, 2)}
        >
          x2
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-bg3 border border-border-dim text-[11px]"
          onClick={() => void startPlayback(currentPlaybackIso, 4)}
        >
          x4
        </button>
      </div>
    </div>
  );
}

