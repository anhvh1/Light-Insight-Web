import { useState } from 'react';
import { MOCK_ALARMS, MOCK_DEVICES } from '@/lib/mock-data';
import type { Alarm, Device } from '@/types';
import { cn } from '@/lib/utils';
import { Camera, MapPin, AlertCircle, Info, ChevronRight, Monitor, DoorClosed, Power, ShieldAlert } from 'lucide-react';

const STATS = [
  { label: 'CAMERA ACTIVE', val: '47', sub: '/ 52 total', color: 'text-psim-green' },
  { label: 'ACTIVE ALARMS', val: '12', sub: '3 critical', color: 'text-psim-red' },
  { label: 'GUARDS ON DUTY', val: '8', sub: 'Ca đêm', color: 'text-psim-orange' },
  { label: 'ACCESS EVENTS/H', val: '142', sub: '↑ normal', color: 'text-psim-accent' },
  { label: 'LPR SCAN/H', val: '38', sub: '2 mismatch', color: 'text-teal' },
];

export function MapView() {
  const [activeFloor, setActiveFloor] = useState('B1');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const floors = ['L5', 'L4', 'L3', 'L2', 'L1', 'B1', 'B2'];

  return (
    <div className="flex flex-col h-full bg-bg0 text-t0">
      {/* Header & Stats Bar */}
      <div className="px-4 py-3 border-b border-border-dim bg-bg0/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-[16px] font-semibold uppercase tracking-tight">Situational Map</h1>
            <div className="flex gap-1 bg-bg2 p-0.5 rounded border border-border-dim text-[10px] font-bold">
              <button className="px-2 py-0.5 bg-bg4 rounded shadow-sm text-t0">B1 — Hầm xe</button>
              <button className="px-2 py-0.5 text-t2 hover:text-t1 transition-colors">L1 — Sảnh</button>
              <button className="px-2 py-0.5 text-t2 hover:text-t1 transition-colors">L2-5 Thương mại</button>
            </div>
          </div>
          <div className="text-[10px] text-t2 font-mono flex gap-4">
            <span><span className="text-psim-red">●</span> 5 alarms active</span>
            <span>47/52 cameras online</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-px bg-border-dim border border-border-dim rounded overflow-hidden">
          {STATS.map((s, i) => (
            <div key={i} className="bg-bg0/40 p-3 flex flex-col gap-1 hover:bg-bg1/60 transition-colors cursor-default">
              <div className="text-[9px] font-mono text-t2 tracking-widest">{s.label}</div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-heading font-bold leading-none", s.color)}>{s.val}</span>
                <span className="text-[10px] text-t2 font-mono">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-10 border-r border-border-dim flex flex-col items-center py-4 gap-3 bg-bg0/30">
          <button className="w-7 h-7 flex items-center justify-center rounded border border-border-dim bg-bg2 text-t1 hover:bg-bg3">+</button>
          <button className="w-7 h-7 flex items-center justify-center rounded border border-border-dim bg-bg2 text-t1 hover:bg-bg3">-</button>
          <button className="w-7 h-7 flex items-center justify-center rounded border border-border-dim bg-bg2 text-psim-accent hover:bg-bg3">🎯</button>
          <button className="w-7 h-7 flex items-center justify-center rounded border border-border-dim bg-bg2 text-t2 hover:bg-bg3 mt-auto">▢</button>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative bg-bg1 overflow-hidden flex items-center justify-center group/map">
          {/* Legend (Bottom Left) */}
          <div className="absolute bottom-4 left-4 bg-bg0/80 backdrop-blur-md border border-border-dim rounded-lg p-2.5 z-20 flex flex-col gap-1.5 shadow-2xl">
            <div className="flex items-center gap-2 text-[9px] font-bold"><span className="w-2 h-2 rounded-full bg-psim-red shadow-[0_0_5px_var(--red)]" /> CRITICAL ALARM</div>
            <div className="flex items-center gap-2 text-[9px] font-bold"><span className="w-2 h-2 rounded-full bg-psim-orange shadow-[0_0_5px_var(--orange)]" /> WARNING</div>
            <div className="flex items-center gap-2 text-[9px] font-bold"><span className="w-2 h-2 rounded-full bg-psim-accent shadow-[0_0_5px_var(--accent)]" /> CAMERA OK</div>
            <div className="flex items-center gap-2 text-[9px] font-bold"><span className="w-2 h-2 rounded-full bg-teal shadow-[0_0_5px_var(--teal)]" /> LPR / ACS</div>
          </div>

          {/* Floor Plan SVG Container */}
          <div className="relative w-[1000px] h-[600px] scale-[0.85] 2xl:scale-100 transition-transform">
            <svg width="100%" height="100%" viewBox="0 0 1000 600" fill="none" className="drop-shadow-2xl">
              {/* Background Grid */}
              <defs>
                <pattern id="grid-large" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="1000" height="600" fill="url(#grid-large)" />
              
              {/* Floor Outer Boundary */}
              <path d="M50 50H950V550H50V50Z" fill="rgba(13,18,32,0.4)" stroke="rgba(255,255,255,0.05)" strokeWidth="2" strokeDasharray="8 8" />

              {/* Lane A Zone */}
              <path d="M100 100H450V350H100V100Z" fill="rgba(0,194,255,0.02)" stroke="rgba(0,194,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
              <text x="110" y="125" fill="var(--accent)" fillOpacity="0.4" fontSize="14" fontWeight="bold" fontFamily="Syne" className="uppercase tracking-widest">Lane A — Inbound</text>
              <rect x="110" y="310" width="60" height="15" rx="2" fill="var(--teal)" fillOpacity="0.3" stroke="var(--teal)" strokeOpacity="0.6" />
              <text x="115" y="321" fill="var(--teal)" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">LPR IN</text>

              {/* Lane B Zone */}
              <path d="M550 100H900V350H550V100Z" fill="rgba(0,194,255,0.02)" stroke="rgba(0,194,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
              <text x="560" y="125" fill="var(--accent)" fillOpacity="0.4" fontSize="14" fontWeight="bold" fontFamily="Syne" className="uppercase tracking-widest">Lane B — Outbound</text>
              <rect x="830" y="310" width="60" height="15" rx="2" fill="var(--teal)" fillOpacity="0.3" stroke="var(--teal)" strokeOpacity="0.6" />
              <text x="835" y="321" fill="var(--teal)" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">LPR OUT</text>

              {/* ACS Indicator Center */}
              <rect x="480" y="335" width="40" height="6" rx="3" fill="var(--accent)" className="animate-pulse" />
              <text x="475" y="330" fill="var(--accent)" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono" opacity="0.5">ACS-01</text>

              {/* Parking Zone */}
              <path d="M100 400H900V530H100V400Z" fill="rgba(155,109,255,0.02)" stroke="rgba(155,109,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
              <text x="110" y="425" fill="var(--purple)" fillOpacity="0.4" fontSize="14" fontWeight="bold" fontFamily="Syne" className="uppercase tracking-widest">Parking Zone</text>
              
              {/* Parking Slots Simulation */}
              {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                <rect key={i} x={120 + i*65} y={445} width="50" height="30" rx="2" stroke="rgba(255,255,255,0.05)" />
              ))}
              {[0,1,2,3,4,5,6,7,8].map(i => (
                <rect key={i} x={120 + i*65} y={485} width="50" height="30" rx="2" stroke="rgba(255,255,255,0.05)" className={cn(i===2 && "fill-psim-accent/10 stroke-psim-accent/30")} />
              ))}

              {/* Alarm indicator on Map */}
              <circle cx="380" cy="460" r="15" fill="none" stroke="var(--red)" strokeWidth="2" strokeDasharray="3 3" className="animate-spin-slow" />
              <text x="400" y="465" fill="var(--red)" fontSize="12" fontWeight="bold">! Đỗ sai</text>
            </svg>

            {/* Interactive Markers (HTML Overlays) */}
            <Marker x={250} y={230} num="01" status="alarm" />
            <Marker x={420} y={245} num="02" status="online" />
            <Marker x={650} y={230} num="03" status="online" />
            <Marker x={780} y={320} num="04" status="warn" />
            <Marker x={480} y={485} num="05" status="online" />
          </div>

          {/* Floating Floor Selector (Right side of Map) */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1 bg-bg0/60 backdrop-blur-md border border-border-dim rounded-lg shadow-xl z-30 font-mono">
            {floors.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFloor(f)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center text-[10px] font-bold rounded transition-all",
                  activeFloor === f ? "bg-psim-accent text-bg0 shadow-[0_0_10px_var(--accent)]" : "text-t2 hover:bg-bg3 hover:text-t1"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Live Events Sidebar (Right) */}
        <div className="w-[280px] border-l border-border-dim bg-bg0/50 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border-dim flex items-center justify-between bg-bg1/20">
            <span className="text-[11px] font-bold tracking-tight uppercase">Live Events</span>
            <span className="text-[10px] font-mono text-psim-accent">12</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {MOCK_ALARMS.slice(0, 8).map((alarm) => (
              <div key={alarm.id} className="p-2.5 bg-bg2/40 border border-border-dim rounded-lg hover:bg-bg2/80 transition-colors cursor-pointer group">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase",
                    alarm.pri === 'critical' ? "bg-psim-red text-white" : "bg-psim-orange text-white"
                  )}>
                    {alarm.pri}
                  </span>
                  <span className="text-[9px] font-mono text-t2">{alarm.time}</span>
                </div>
                <div className="text-[11px] font-semibold leading-snug group-hover:text-psim-accent transition-colors truncate mb-1">
                  {alarm.title}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-t2 font-mono">
                  <MapPin size={8} /> {alarm.loc}
                </div>
              </div>
            ))}
          </div>
          <button className="p-2.5 text-[10px] font-bold text-center border-t border-border-dim hover:bg-bg3 transition-colors text-t2 flex items-center justify-center gap-1 uppercase">
            View All History <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Marker({ x, y, num, status }: { x: number, y: number, num: string, status: 'online'|'alarm'|'warn'|'offline' }) {
  const colors = {
    online: 'border-psim-accent bg-psim-accent/20 text-psim-accent shadow-[0_0_10px_var(--accent)]',
    alarm: 'border-psim-red bg-psim-red/20 text-psim-red shadow-[0_0_15px_var(--red)] animate-pulse',
    warn: 'border-psim-orange bg-psim-orange/20 text-psim-orange shadow-[0_0_10px_var(--orange)]',
    offline: 'border-t2 bg-bg3 text-t2',
  };

  return (
    <div 
      className="absolute flex flex-col items-center group cursor-pointer z-10"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-125",
        colors[status]
      )}>
        {num}
      </div>
      {status === 'alarm' && (
        <div className="mt-1 bg-psim-red text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
          ALARM
        </div>
      )}
    </div>
  );
}
