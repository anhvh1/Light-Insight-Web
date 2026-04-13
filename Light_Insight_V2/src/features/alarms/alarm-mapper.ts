import type { Alarm, PriorityMapping } from '@/types';

export interface AlarmPayload {
  alarmId?: string;
  alarmName?: string;
  location?: string;
  message?: string;
  priorityLevel?: number;
  priorityName?: string;
  source?: string;
  stateLevel?: number;
  stateName?: string;
  time?: string;
  type?: string;
}

let counter = 0;

function generateId(): string {
  counter += 1;
  return `ALM-${Date.now()}-${counter}`;
}

function formatDisplayTime(value?: string): string {
  if (!value) return '';

  const timeMatch = value.match(/\b\d{2}:\d{2}:\d{2}\b/);
  if (timeMatch) {
    return timeMatch[0];
  }

  return value;
}

function normalizePriority(priorityName?: string): string {
  const normalized = (priorityName ?? '').trim().toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'low') return 'low';
  return 'medium';
}

function normalizeStatus(stateName?: string): string {
  const normalized = (stateName ?? '').trim().toLowerCase();
  if (normalized === 'new') return 'new';
  if (normalized === 'in progress' || normalized === 'progress' || normalized === 'in_progress') return 'in progress';
  if (normalized === 'on hold' || normalized === 'hold' || normalized === 'on_hold') return 'on hold';
  if (normalized === 'close' || normalized === 'closed') return 'close';
  return normalized || 'new';
}

/** Bản ghi sau trong mảng mapping ghi đè nếu trùng tên sự kiện. */
export function buildEventPriorityLookup(mappings: PriorityMapping[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of mappings) {
    const pri = normalizePriority(m.PriorityName);
    for (const ev of m.AnalyticsEvents ?? []) {
      const key = ev.trim().toLowerCase();
      if (key) map.set(key, pri);
    }
  }
  return map;
}

export function resolveAlarmPriority(
  payload: AlarmPayload,
  lookup: ReadonlyMap<string, string> | undefined,
): string {
  if (lookup && lookup.size > 0) {
    const eventName = (payload.message ?? payload.alarmName ?? '').trim();
    if (eventName) {
      const mapped = lookup.get(eventName.toLowerCase());
      if (mapped) return mapped;
    }
  }
  // Không fallback về priorityName từ Alarm/GetAll hoặc socket: không map được thì hiển thị NONE.
  return 'none';
}

function toAlarm(
  payload: AlarmPayload,
  isNew: boolean,
  lookup?: ReadonlyMap<string, string>,
): Alarm {
  const id = payload.alarmId?.trim() || generateId();
  const statusByLevel: Record<number, { status: string; label: string }> = {
    1: { status: 'new', label: 'New' },
    4: { status: 'in progress', label: 'In progress' },
    9: { status: 'on hold', label: 'On hold' },
    11: { status: 'close', label: 'Close' },
  };
  const level = payload.stateLevel ?? -1;
  const stateName = payload.stateName?.trim();
  const mapped = statusByLevel[level];
  const status = mapped?.status ?? normalizeStatus(stateName);
  const statusLabel = stateName && stateName.length > 0 ? stateName : (mapped?.label ?? status);

  return {
    id,
    title: payload.message ?? payload.alarmName ?? '',
    pri: resolveAlarmPriority(payload, lookup),
    apiPriorityName: payload.priorityName,
    src: payload.source ?? '',
    status,
    statusLabel,
    statusLevel: payload.stateLevel,
    time: formatDisplayTime(payload.time),
    type: 'light',
    typeLabel: payload.type?.trim() || 'Hệ thống',
    loc: payload.location ?? '',
    corr: 0,
    isNew,
  };
}

export function normalizeSignalRAlarm(
  payload: AlarmPayload,
  lookup?: ReadonlyMap<string, string>,
): Alarm {
  return toAlarm(payload, true, lookup);
}

export function normalizeApiAlarm(
  payload: AlarmPayload,
  lookup?: ReadonlyMap<string, string>,
): Alarm {
  return toAlarm(payload, false, lookup);
}
