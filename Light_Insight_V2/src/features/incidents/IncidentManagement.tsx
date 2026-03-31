import { useState } from 'react';
import { MOCK_INCIDENTS } from '@/lib/mock-data';
import type { Incident, IncidentStatus } from '@/types';
import { StatusPill, TypeBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { 
  ShieldAlert, 
  Search, 
  FileDown, 
  ChevronRight, 
  CheckCircle2, 
  ExternalLink,
  Video,
  Link2
} from 'lucide-react';

export function IncidentManagement() {
  const [activeTab, setActiveTab] = useState<IncidentStatus | 'all'>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(MOCK_INCIDENTS[0]);

  const filteredIncidents = MOCK_INCIDENTS.filter(inc => 
    activeTab === 'all' || inc.status === activeTab
  );

  const tabs: (IncidentStatus | 'all')[] = ['all', 'new', 'prog', 'res'];

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'new': return <span className="px-2 py-0.5 rounded bg-psim-red/15 text-psim-red text-[10px] font-bold">NEW</span>;
      case 'prog': return <span className="px-2 py-0.5 rounded bg-psim-orange/15 text-psim-orange text-[10px] font-bold">IN PROGRESS</span>;
      case 'res': return <span className="px-2 py-0.5 rounded bg-psim-green/15 text-psim-green text-[10px] font-bold">RESOLVED</span>;
      case 'ack': return <span className="px-2 py-0.5 rounded bg-psim-accent/15 text-psim-accent text-[10px] font-bold">ACK</span>;
      default: return <span className="px-2 py-0.5 rounded bg-bg3 text-t2 text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const renderIncidentTable = () => (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">ID</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Mức độ</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Mô tả</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Nguồn</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Vị trí</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Trạng thái</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Người xử lý</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">MTTD</th>
            <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap"></th>
          </tr>
        </thead>
        <tbody>
          {filteredIncidents.map((inc) => (
            <tr 
              key={inc.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-bg2 border-b border-border-dim group",
                selectedIncident?.id === inc.id && "bg-[rgba(0,194,255,0.05)]",
                inc.pri === 'critical' && selectedIncident?.id !== inc.id && "border-l-[3px] border-psim-red",
                inc.pri === 'high' && selectedIncident?.id !== inc.id && "border-l-[3px] border-psim-orange",
                inc.pri === 'medium' && selectedIncident?.id !== inc.id && "border-l-[3px] border-psim-yellow",
                inc.pri === 'low' && selectedIncident?.id !== inc.id && "border-l-[3px] border-t2",
              )}
              onClick={() => setSelectedIncident(inc)}
            >
              <td className="py-2.5 px-3 align-middle text-[11px] font-mono text-psim-accent font-bold">#INC-{inc.id}</td>
              <td className="py-2.5 px-3 align-middle"><StatusPill priority={inc.pri} className="text-[9px]" /></td>
              <td className="py-2.5 px-3 align-middle text-[12px] font-semibold max-w-[250px] truncate group-hover:text-psim-accent transition-colors">{inc.title}</td>
              <td className="py-2.5 px-3 align-middle"><TypeBadge type={inc.src as any} /></td>
              <td className="py-2.5 px-3 align-middle text-[11px] text-t-2">{inc.loc}</td>
              <td className="py-2.5 px-3 align-middle">{getStatusBadge(inc.status)}</td>
              <td className="py-2.5 px-3 align-middle text-[11px] text-t-1">{inc.user}</td>
              <td className="py-2.5 px-3 align-middle text-[11px] text-psim-accent font-mono">{inc.mttd}</td>
              <td className="py-2.5 px-3 align-middle text-t2"><ChevronRight size={14} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderIncidentDetail = () => (
    <div className="bg-bg0 overflow-y-auto p-5 flex flex-col gap-5 min-w-[400px] border-l border-border-dim scrollbar-thin scrollbar-thumb-bg4">
      {!selectedIncident ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-4 mt-20">
           <ShieldAlert size={64} strokeWidth={1} />
           <div className="text-center">
              <div className="text-[11px] uppercase font-bold tracking-[0.3em]">No Selection</div>
              <div className="text-[10px] text-t2 font-medium mt-1">Chọn một incident để xem chi tiết</div>
           </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-mono text-psim-accent font-bold uppercase tracking-[0.2em]">#INC-2026-{selectedIncident.id}</div>
              <h2 className="text-[16px] font-heading font-bold text-t0 leading-tight tracking-tight">
                {selectedIncident.title}
              </h2>
            </div>
            <StatusPill priority={selectedIncident.pri} className="text-[10px] px-3 shadow-lg" />
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-px bg-border-dim border border-border-dim rounded overflow-hidden shadow-sm">
             {[
               { label: 'Nguồn phát hiện', val: 'Futech LPR API' },
               { label: 'Vị trí', val: selectedIncident.loc },
               { label: 'Phát hiện lúc', val: '02:14:33', mono: true },
               { label: 'Biển số', val: '43A-88821', mono: true, color: 'text-psim-red' },
               { label: 'MTTD', val: selectedIncident.mttd, color: 'text-psim-accent' },
               { label: 'Người nhận', val: selectedIncident.user },
             ].map((m, i) => (
               <div key={i} className="bg-bg2 p-2.5 flex flex-col gap-1">
                  <span className="text-[8px] text-t-2 font-mono uppercase tracking-widest">{m.label}</span>
                  <span className={cn("text-[11px] font-bold leading-tight", m.mono && "font-mono", m.color || "text-t-1")}>
                    {m.val}
                  </span>
               </div>
             ))}
          </div>

          {/* Correlation */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[10px] font-bold text-purple uppercase tracking-widest flex items-center gap-2">
              <Link2 size={14} /> Correlation — 3 nguồn liên quan
            </div>
            <div className="flex flex-col gap-1.5">
               <div className="flex items-center gap-3 p-2 bg-bg2 border border-border-dim rounded-md hover:border-psim-accent/30 transition-colors">
                  <div className="w-8 h-8 rounded bg-[rgba(0,229,204,0.15)] flex items-center justify-center shrink-0 border border-[rgba(0,229,204,0.2)] text-teal text-[13px]">🚗</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-bold text-t-0 truncate">LPR Mismatch — 43A-88821</div>
                    <div className="text-[9px] font-mono text-t-2">Futech API · Cổng IN</div>
                  </div>
                  <div className="text-[9px] font-mono text-t-2">02:14:33</div>
               </div>
               <div className="flex items-center gap-3 p-2 bg-bg2 border border-border-dim rounded-md hover:border-psim-accent/30 transition-colors">
                  <div className="w-8 h-8 rounded bg-[rgba(0,194,255,0.15)] flex items-center justify-center shrink-0 border border-[rgba(0,194,255,0.2)] text-psim-accent text-[13px]">📷</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-bold text-t-0 truncate">Camera CAM-B1-01 phát hiện xe</div>
                    <div className="text-[9px] font-mono text-t-2">Milestone · AI-VMD</div>
                  </div>
                  <div className="text-[9px] font-mono text-t-2">02:14:35</div>
               </div>
               <div className="flex items-center gap-3 p-2 bg-bg2 border border-border-dim rounded-md hover:border-psim-accent/30 transition-colors">
                  <div className="w-8 h-8 rounded bg-[rgba(155,109,255,0.15)] flex items-center justify-center shrink-0 border border-[rgba(155,109,255,0.2)] text-purple text-[13px]">🏠</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-bold text-t-0 truncate">BMS: Không có booking đăng ký</div>
                    <div className="text-[9px] font-mono text-t-2">BMS Portal · Resident DB</div>
                  </div>
                  <div className="text-[9px] font-mono text-t-2">02:14:36</div>
               </div>
            </div>
          </div>

          {/* SOP */}
          <div className="bg-bg2/50 border border-border-dim rounded-lg p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border-dim pb-2.5">
              <div className="text-[11px] font-bold text-t-0 uppercase flex items-center gap-2">
                <CheckCircle2 size={15} className="text-psim-accent" /> SOP — Xe không đăng ký
              </div>
              <span className="text-[10px] font-mono text-psim-accent font-bold bg-psim-accent/10 px-2 py-0.5 rounded-full">2 / 5</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { t: 'Xác nhận alarm và xem camera live tại cổng', done: true },
                { t: 'Kiểm tra biển số trong whitelist BMS', done: true },
                { t: 'Liên hệ bảo vệ cổng B1 kiểm tra xe thực tế', done: false, active: true },
                { t: 'Thông báo Trưởng Ca nếu xe không hợp lệ', done: false },
                { t: 'Log và đóng incident kèm gói bằng chứng', done: false },
              ].map((s, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-2.5 p-1.5 rounded transition-colors group",
                  s.active ? "bg-bg4/30" : "hover:bg-bg3"
                )}>
                  <div className={cn(
                    "w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all",
                    s.done ? "bg-psim-green border-psim-green text-white" : "border-border-dim group-hover:border-psim-accent"
                  )}>
                    {s.done && <CheckCircle2 size={10} />}
                  </div>
                  <span className={cn(
                    "text-[12px] transition-all",
                    s.done ? "text-t2 line-through" : "text-t-1",
                    s.active && "text-psim-accent font-bold"
                  )}>
                    {s.t}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
             <button className="h-9 rounded-md bg-psim-accent text-bg0 font-bold text-[11px] uppercase tracking-wider hover:opacity-90 transition-opacity">📡 Giao việc Guard</button>
             <button className="h-9 rounded-md bg-bg3 text-t-1 border border-border-dim font-bold text-[11px] uppercase tracking-wider hover:bg-bg4 transition-colors flex items-center justify-center gap-2">
                <Video size={14} className="text-psim-green" /> Camera Live
             </button>
             <button className="h-9 rounded-md bg-[rgba(255,204,0,0.1)] text-psim-yellow border border-[rgba(255,204,0,0.2)] font-bold text-[11px] uppercase tracking-wider hover:bg-[rgba(255,204,0,0.2)] transition-colors">⚡ Escalate</button>
             <button className="h-9 rounded-md bg-bg3 text-t-1 border border-border-dim font-bold text-[11px] uppercase tracking-wider hover:bg-bg4 transition-colors flex items-center justify-center gap-2">📦 Xuất bằng chứng</button>
          </div>

          {/* Evidence */}
          <div className="flex flex-col gap-2.5">
             <h3 className="text-[10px] font-mono text-t-2 uppercase tracking-widest font-bold">Evidence Package</h3>
             <div className="flex flex-col gap-1.5">
                {[
                  { icon: '🎬', name: 'CAM-B1-01_02h14m33s.mp4', info: '3.2 MB · 30 giây · H.265' },
                  { icon: '🖼', name: 'LPR_snapshot_43A88821.jpg', info: '420 KB · 1080p' }
                ].map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-bg2 border border-border-dim rounded-md group hover:border-psim-accent/30 transition-colors">
                     <span className="text-[18px] shrink-0">{ev.icon}</span>
                     <div className="flex-1 overflow-hidden">
                        <div className="text-[11px] font-bold truncate text-t-1">{ev.name}</div>
                        <div className="text-[9px] font-mono text-t-2 uppercase">{ev.info}</div>
                     </div>
                     <button className="w-7 h-7 rounded flex items-center justify-center text-t2 hover:text-psim-accent transition-colors">
                        <ExternalLink size={14} />
                     </button>
                  </div>
                ))}
             </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-3 pb-6">
             <h3 className="text-[10px] font-mono text-t-2 uppercase tracking-widest font-bold px-1">Audit Timeline</h3>
             <div className="flex flex-col gap-0 relative ml-2 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border-dim">
                {[
                  { t: 'Alarm tạo tự động — LPR mismatch', time: '02:14:33', src: 'Hệ thống', on: true },
                  { t: 'Correlation với camera và BMS — 3 nguồn khớp', time: '02:14:36', src: 'Hệ thống', on: true },
                  { t: 'Trần Hùng xác nhận và nhận incident', time: '02:14:41', src: 'Operator', on: true },
                  { t: 'Đang chờ xử lý thực địa...', time: '—', src: 'Queue', last: true },
                ].map((tl, i) => (
                  <div key={i} className="relative pl-6 pb-4 flex flex-col gap-0.5 last:pb-0">
                     <div className={cn(
                       "absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full z-10",
                       tl.on ? "bg-psim-accent shadow-[0_0_8px_var(--accent)]" : "bg-bg4"
                     )} />
                     <div className={cn("text-[12px] font-bold leading-none", tl.on ? "text-t-0" : "text-t2")}>{tl.t}</div>
                     <div className="text-[9px] font-mono text-t-2 uppercase">{tl.time} · {tl.src}</div>
                  </div>
                ))}
             </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg0">
      {/* Header */}
      <div className="p-3.5 flex items-center gap-3 border-b border-border-dim bg-bg0 shrink-0">
        <div className="font-heading text-[15px] font-semibold text-t0 uppercase tracking-tight">Incident Management</div>
        <div className="flex gap-0.5 bg-bg2 rounded-md p-0.5 ml-2">
          {tabs.map(tab => (
            <button
              key={tab}
              className={cn(
                "px-3 py-1 text-[11px] rounded-md cursor-pointer transition-colors",
                activeTab === tab ? 'bg-bg4 text-t0' : 'text-t2 hover:bg-bg3 hover:text-t1'
              )}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab === 'all' ? 'Tất cả' : tab === 'prog' ? 'Đang xử lý' : tab === 'res' ? 'Đã giải quyết' : 'Đang mở'}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-t-2 font-mono ml-4 uppercase tracking-widest border-l border-border-dim pl-4">
          {MOCK_INCIDENTS.length} incidents · Ca đêm
        </div>
        <button className="ml-auto px-4 py-1.5 bg-psim-accent text-bg0 rounded-md text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">+ Tạo Incident</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Incident List */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
          <div className="p-2.5 flex gap-2 items-center border-b border-border-dim shrink-0 bg-bg0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-t2" />
              <input 
                className="w-56 bg-bg2 border border-border-dim rounded-md pl-9 pr-3 py-1.5 text-t0 text-[12px] outline-none focus:border-psim-accent transition-colors" 
                placeholder="Tìm incident..." 
              />
            </div>
            <select className="bg-bg2 border border-border-dim rounded-md px-2 py-1.5 text-[11px] text-t1 outline-none font-medium">
              <option>Tất cả mức độ</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
            </select>
            <select className="bg-bg2 border border-border-dim rounded-md px-2 py-1.5 text-[11px] text-t1 outline-none font-medium">
              <option>Tất cả nguồn</option>
              <option>AI</option>
              <option>LPR</option>
              <option>ACS</option>
            </select>
            <button className="ml-auto px-3 py-1.5 text-[11px] font-bold rounded-md bg-bg3 text-t1 border border-border-dim hover:bg-bg4 transition-colors flex items-center gap-1.5">
              <FileDown size={14} /> EXPORT PDF
            </button>
          </div>

          {renderIncidentTable()}
        </div>

        {/* Right: Detail Panel */}
        {renderIncidentDetail()}
      </div>
    </div>
  );
}
