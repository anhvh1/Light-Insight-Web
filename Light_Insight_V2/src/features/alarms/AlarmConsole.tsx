import { useEffect, useMemo, useState } from 'react';
import type { AlarmType } from '@/types';
import { StatusPill, TypeBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { useAlarmSignalR } from './useAlarmSignalR';

const PAGE_SIZE = 15;

export function AlarmConsole() {
  const { alarms, connected } = useAlarmSignalR();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [filterType, setFilterType] = useState<AlarmType | 'all'>('all');
  const [selectedAlarmId, setSelectedAlarmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const selectedAlarm = useMemo(
    () => alarms.find(a => a.id === selectedAlarmId) ?? null,
    [alarms, selectedAlarmId]
  );
  const selectedAlarmTypeLabel = selectedAlarm?.typeLabel || selectedAlarm?.type || 'Hệ thống';

  const filteredAlarms = useMemo(
    () =>
      alarms.filter((alarm) => {
        const matchesTab = activeTab === 'all' || alarm.status === activeTab;
        const matchesType = filterType === 'all' || alarm.type === filterType;
        return matchesTab && matchesType;
      }),
    [activeTab, alarms, filterType]
  );

  const tabs = ['all', 'new', 'ack', 'prog'];
  const filterTypes: (AlarmType | 'all')[] = ['all', 'ai', 'lpr', 'acs', 'fire', 'bms', 'tech', 'light'];
  const totalPages = Math.max(1, Math.ceil(filteredAlarms.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedAlarms = filteredAlarms.slice(startIndex, startIndex + PAGE_SIZE);

  const handleAcknowledge = () => {
    if (!selectedAlarmId) return;
    setSelectedAlarmId(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterType]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const renderAlarmTable = () => (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Priority</th>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Loại</th>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Mô tả</th>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Nguồn</th>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Vị trí</th>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Trạng thái</th>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Thời gian</th>
              <th className="py-2 px-3 text-[10px] font-mono text-t-2 uppercase tracking-wider border-b border-border-dim bg-bg1 sticky top-0 z-10 whitespace-nowrap">Tương quan</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAlarms.map((alarm) => (
              <tr
                key={alarm.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-bg2 border-b border-border-dim",
                  selectedAlarmId === alarm.id && "bg-[rgba(0,194,255,0.05)]",
                )}
                onClick={() => setSelectedAlarmId(alarm.id)}
              >
                <td className="py-2.5 px-3 align-middle text-[12px]"><StatusPill priority={alarm.pri} /></td>
                <td className="py-2.5 px-3 align-middle text-[12px]"><TypeBadge type={alarm.type} /></td>
                <td className="py-2.5 px-3 align-middle text-[12px]">
                  {alarm.title}
                  {alarm.status === 'new' && <span className="ml-1.5 text-[9px] bg-psim-red text-white px-[6px] py-[1px] rounded-[3px] font-mono">NEW</span>}
                  {alarm.corr > 1 && <span className="ml-1.5 text-[9px] bg-[rgba(155,109,255,0.2)] text-purple px-[5px] py-[1px] rounded-[3px] font-mono">+{alarm.corr} corr</span>}
                </td>
                <td className="py-2.5 px-3 align-middle text-[11px] text-t-2">{alarm.src}</td>
                <td className="py-2.5 px-3 align-middle text-[11px] text-t-2">{alarm.loc}</td>
                <td className="py-2.5 px-3 align-middle text-[12px]">
                  {alarm.status === 'new' && <span className="px-2 py-0.5 rounded bg-psim-red/15 text-psim-red text-[10px] font-bold">NEW</span>}
                  {alarm.status === 'ack' && <span className="px-2 py-0.5 rounded bg-psim-accent/15 text-psim-accent text-[10px] font-bold">ACK</span>}
                  {alarm.status === 'prog' && <span className="px-2 py-0.5 rounded bg-psim-orange/15 text-psim-orange text-[10px] font-bold">IN PROGRESS</span>}
                </td>
                <td className="py-2.5 px-3 align-middle text-[11px] text-t-2 font-mono">{alarm.time}</td>
                <td className="py-2.5 px-3 align-middle text-[11px] text-purple font-mono">
                  {alarm.corr > 0 ? `${alarm.corr} nguồn` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border-dim bg-bg1 px-3 py-2 text-[11px]">
        <button
          className="rounded-md border border-border-dim px-3 py-1 text-t1 transition-colors hover:bg-bg3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        >
          Prev
        </button>
        <div className="font-mono text-t-2">
          Trang {currentPage} / {totalPages} · {filteredAlarms.length} alarm
        </div>
        <button
          className="rounded-md border border-border-dim px-3 py-1 text-t1 transition-colors hover:bg-bg3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderAlarmDetail = () => (
    <div className="bg-bg0 w-[360px] shrink-0 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-3 border-l border-border-dim">
      {!selectedAlarm ? (
        <div className="text-t-2 text-[12px] text-center py-8">
          ← Chọn một alarm để xem chi tiết
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] text-psim-accent">{selectedAlarm.id}</div>
              <div
                className="mt-0.5 text-[14px] font-semibold leading-tight overflow-hidden break-words"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
                title={selectedAlarm.title}
              >
                {selectedAlarm.title}
              </div>
            </div>
            <StatusPill priority={selectedAlarm.pri} className="ml-auto shrink-0 text-[11px]" />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="min-w-0 bg-bg2 rounded-md border border-border-dim p-2.5">
              <div className="text-[9px] font-mono text-t-2 uppercase tracking-wider mb-0.5">Nguồn</div>
              <div
                className="text-[12px] font-medium overflow-hidden break-words"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
                title={selectedAlarm.src}
              >
                {selectedAlarm.src}
              </div>
            </div>
            <div className="min-w-0 bg-bg2 rounded-md border border-border-dim p-2.5">
              <div className="text-[9px] font-mono text-t-2 uppercase tracking-wider mb-0.5">Vị trí</div>
              <div className="text-[12px] font-medium">{selectedAlarm.loc || '—'}</div>
            </div>
            <div className="min-w-0 bg-bg2 rounded-md border border-border-dim p-2.5">
              <div className="text-[9px] font-mono text-t-2 uppercase tracking-wider mb-0.5">Thời gian</div>
              <div className="font-mono text-[11px]">{selectedAlarm.time}</div>
            </div>
            <div className="min-w-0 bg-bg2 rounded-md border border-border-dim p-2.5">
              <div className="text-[9px] font-mono text-t-2 uppercase tracking-wider mb-0.5">Tương quan</div>
              <div className="text-[12px] font-medium text-purple">{selectedAlarm.corr} nguồn</div>
            </div>
          </div>

          {selectedAlarm.corr > 1 && (
            <div className="bg-bg2 rounded-md p-3 border border-[rgba(155,109,255,0.2)]">
              <div className="text-[10px] font-mono text-purple uppercase tracking-wider mb-2">🔗 Alarm Correlation</div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0 bg-[rgba(0,229,204,0.15)] text-teal">🚗</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium" title={`LPR mismatch — ${selectedAlarm.src}`}>
                      LPR mismatch — {selectedAlarm.src}
                    </div>
                    <div className="truncate text-[10px] text-t-2 font-mono" title={selectedAlarm.loc}>
                      {selectedAlarm.loc}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-[10px] text-t-2">{selectedAlarm.time}</div>
                </div>
                {selectedAlarm.corr > 1 && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0 bg-[rgba(0,194,255,0.15)] text-psim-accent">📷</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium">Camera phát hiện sự kiện</div>
                      <div className="truncate text-[10px] text-t-2 font-mono">Milestone · AI-VMD</div>
                    </div>
                    <div className="shrink-0 font-mono text-[10px] text-t-2">+2s</div>
                  </div>
                )}
                {selectedAlarm.corr > 2 && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0 bg-[rgba(155,109,255,0.15)] text-purple">🏠</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium">BMS xác nhận không có booking</div>
                      <div className="truncate text-[10px] text-t-2 font-mono">BMS Portal</div>
                    </div>
                    <div className="shrink-0 font-mono text-[10px] text-t-2">+3s</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-1.5 mt-2">
            <button className="flex-1 px-3.5 py-1.5 rounded-md text-[12px] font-medium bg-psim-accent text-bg0 hover:opacity-90 transition-colors">📋 Xử lý Incident</button>
            <button className="flex-1 px-3.5 py-1.5 rounded-md text-[12px] font-medium bg-bg3 text-t1 border border-border-dim hover:bg-bg4 transition-colors">📷 Xem Camera</button>
          </div>
          <div className="flex gap-1.5">
            <button className="flex-1 px-3.5 py-1.5 rounded-md text-[12px] font-medium bg-[rgba(255,204,0,0.15)] text-psim-yellow border border-[rgba(255,204,0,0.3)] hover:bg-[rgba(255,204,0,0.25)] transition-colors">⚡ Escalate</button>
            <button 
              className="flex-1 px-3.5 py-1.5 rounded-md text-[12px] font-medium bg-[rgba(255,59,92,0.15)] text-psim-red border border-[rgba(255,59,92,0.3)] hover:bg-[rgba(255,59,92,0.25)] transition-colors"
              onClick={handleAcknowledge}
            >
              ✓ Acknowledge
            </button>
          </div>

          <div className="mt-2">
            <div className="text-[10px] font-mono text-t-2 uppercase tracking-wider mb-2">Timeline</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-psim-accent border-2 border-border-brighter shrink-0 mt-0.5" />
                  <div className="flex-1 w-0.5 bg-border-dim mt-0.5 min-h-[12px]" />
                </div>
                <div className="min-w-0 flex-1 pb-1.5">
                  <div className="truncate text-[12px] leading-tight" title={`Alarm tạo tự động — ${selectedAlarm.src}`}>
                    Alarm tạo tự động — {selectedAlarm.src}
                  </div>
                  <div className="font-mono text-[10px] text-t-2 mt-0.5">{selectedAlarm.time} · {selectedAlarmTypeLabel}</div>
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <div className={cn("w-2 h-2 rounded-full border-2 border-border-brighter shrink-0 mt-0.5", selectedAlarm.status !== 'new' ? 'bg-psim-accent' : 'bg-bg4')} />
                </div>
                <div className="flex-1">
                  <div className="text-[12px] leading-tight" style={{ color: selectedAlarm.status === 'new' ? 'var(--t2)' : 'var(--t0)' }}>
                    {selectedAlarm.status === 'new' ? 'Chờ xác nhận...' : 'Operator đã xác nhận'}
                  </div>
                  {selectedAlarm.status !== 'new' && <div className="font-mono text-[10px] text-t-2 mt-0.5">+8s · Operator</div>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg0">
      <div className="p-3.5 flex items-center gap-2.5 border-b border-border-dim shrink-0">
        <div className="font-heading text-[15px] font-semibold text-t0">Unified Alarm Console</div>
        <div className={cn(
          "w-2 h-2 rounded-full",
          connected ? 'bg-psim-green' : 'bg-psim-red'
        )} title={connected ? 'SignalR connected' : 'SignalR disconnected'} />
        <div className="flex gap-0.5 bg-bg2 rounded-md p-0.5">
          {tabs.map(tab => (
            <button
              key={tab}
              className={cn(
                "px-3 py-1 text-[11px] rounded-md cursor-pointer transition-colors",
                activeTab === tab ? 'bg-bg4 text-t0' : 'text-t2 hover:bg-bg3 hover:text-t1'
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'Tất cả' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-t-2 font-mono ml-auto">
          {filteredAlarms.length} active · {alarms.filter(a => a.pri === 'critical').length} critical
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Alarm Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2.5 flex gap-2 items-center border-b border-border-dim shrink-0 flex-wrap bg-bg0">
            <input 
              className="w-52 bg-bg2 border border-border-dim rounded-md px-3 py-1.5 text-t0 text-[12px] outline-none focus:border-psim-accent transition-colors" 
              placeholder="🔍  Tìm alarm..." 
            />
            <div className="flex gap-1">
              {filterTypes.map(type => (
                <button
                  key={type}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] cursor-pointer border border-border-dim bg-bg2 font-mono transition-colors",
                    filterType === type ? 'bg-psim-accent/15 text-psim-accent border-psim-accent/30' : 'text-t2 hover:bg-bg3 hover:text-t1'
                  )}
                  onClick={() => setFilterType(type)}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="ml-auto px-3 py-1.5 text-[11px] font-medium rounded-md bg-psim-red/15 text-psim-red border border-psim-red/30 hover:bg-psim-red/25 transition-colors">🔕 Mute All</button>
            <button className="px-3 py-1.5 text-[11px] font-medium rounded-md bg-bg3 text-t1 border border-border-dim hover:bg-bg4 transition-colors">⬇ Export</button>
          </div>
          
          {renderAlarmTable()}
          
          {/* Quick Contact Bar */}
          <div className="p-2.5 bg-bg1 border-t border-border-dim flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-t-2 font-mono whitespace-nowrap">LIÊN LẠC NHANH</span>
            <div className="flex gap-1.5 overflow-x-auto flex-1 scrollbar-hide">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg2 rounded-full text-[11px] cursor-pointer border border-border-dim hover:border-psim-accent transition-colors whitespace-nowrap">
                <div className="w-5 h-5 rounded-full bg-[linear-gradient(135deg,var(--accent2),var(--green))] flex items-center justify-center text-[9px] font-bold text-white">NM</div>
                Nguyễn Minh · B1
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg2 rounded-full text-[11px] cursor-pointer border border-border-dim hover:border-psim-accent transition-colors whitespace-nowrap">
                <div className="w-5 h-5 rounded-full bg-[linear-gradient(135deg,var(--accent2),var(--purple))] flex items-center justify-center text-[9px] font-bold text-white">LĐ</div>
                Lê Văn Đức · L1
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg2 rounded-full text-[11px] cursor-pointer border border-border-dim hover:border-psim-accent transition-colors whitespace-nowrap">
                <div className="w-5 h-5 rounded-full bg-[linear-gradient(135deg,var(--accent2),var(--red))] flex items-center justify-center text-[9px] font-bold text-white">KT</div>
                Kỹ Thuật
              </div>
            </div>
            <button className="w-10 h-10 rounded-full bg-bg3 border-2 border-border-dim flex items-center justify-center cursor-pointer text-[18px] transition-all duration-200 hover:border-psim-accent hover:text-psim-accent active:scale-95 shadow-lg">
              🎙
            </button>
            <div className="text-[10px] text-t-2 font-mono uppercase tracking-tighter">PTT</div>
          </div>
        </div>
        
        {/* Right: Alarm Detail */}
        {renderAlarmDetail()}
      </div>
    </div>
  );
}
