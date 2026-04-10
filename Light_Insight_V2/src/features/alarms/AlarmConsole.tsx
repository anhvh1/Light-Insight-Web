import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AlarmType } from '@/types';
import { StatusPill, TypeBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { useAlarmSignalR } from './useAlarmSignalR';
import { AlarmSearchPanel } from './AlarmSearchPanel';
import { alarmApi, type AlarmFilters } from '@/lib/alarm-api';
import './alarm.css';

const EMPTY_FILTERS: AlarmFilters = {
  priorityName: undefined,
  stateName: undefined,
  message: undefined,
  source: undefined,
  fromTime: undefined,
  toTime: undefined,
};

function getTodayStartString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T00:00:00`;
}

function getDefaultFilterValues(): AlarmFilters {
  const todayStart = getTodayStartString();
  return {
    ...EMPTY_FILTERS,
    fromTime: todayStart,
    toTime: todayStart,
  };
}

export function AlarmConsole() {
  const {
    alarms,
    connected,
    loading,
    canNextPage,
    pendingRealtimeCount,
    filters,
    refreshAlarms,
    loadMore,
    setIsAtTop,
    clearBellCount,
    clearPendingRealtimeCount,
    markAlarmAsRead,
  } = useAlarmSignalR();

  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  // (kept for possible future edge handling)
  const firstRowHeightRef = useRef<number | null>(null);
  const firstRowRef = useCallback((node: HTMLTableRowElement | null) => {
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.height > 0) {
      firstRowHeightRef.current = rect.height;
    }
  }, []);

  const [activeTab, setActiveTab] = useState<string>('all');
  const [filterType, setFilterType] = useState<AlarmType | 'all'>('all');
  const [selectedAlarmId, setSelectedAlarmId] = useState<string | null>(null);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [localFilters, setLocalFilters] = useState<AlarmFilters>(getDefaultFilterValues());
  const [useFromTime, setUseFromTime] = useState(false);
  const [useToTime, setUseToTime] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [sources, setSources] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingDicts, setLoadingDicts] = useState(false);
  const [dictLoaded, setDictLoaded] = useState(false);

  useEffect(() => {
    isAutoScrollRef.current = isAutoScroll;
  }, [isAutoScroll]);

  useEffect(() => {
    setIsAtTop(isAutoScroll);
    if (isAutoScroll) {
      clearPendingRealtimeCount();
    }
  }, [clearPendingRealtimeCount, isAutoScroll, setIsAtTop]);

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

  const tabs: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'new', label: 'New' },
    { value: 'in progress', label: 'In progress' },
    { value: 'on hold', label: 'On hold' },
    { value: 'close', label: 'Close' },
  ];
  const filterTypes: (AlarmType | 'all')[] = ['all', 'ai', 'lpr', 'acs', 'fire', 'bms', 'tech', 'light'];

  const handleAcknowledge = () => {
    if (!selectedAlarmId) return;
    setSelectedAlarmId(null);
  };

  const mapTabToStateName = (tabValue: string): AlarmFilters['stateName'] | undefined => {
    if (tabValue === 'new') return 'New';
    if (tabValue === 'in progress') return 'In progress';
    if (tabValue === 'on hold') return 'On hold';
    if (tabValue === 'close') return 'Closed';
    return undefined;
  };

  const handleStatusTabClick = async (tabValue: string) => {
    setActiveTab(tabValue);
    const stateName = mapTabToStateName(tabValue);
    setLocalFilters((prev) => ({
      ...prev,
      stateName,
    }));
    await refreshAlarms({ ...filters, stateName });
  };

  useEffect(() => {
    void refreshAlarms(EMPTY_FILTERS);
  }, [refreshAlarms]);

  useEffect(() => {
    const defaultValues = getDefaultFilterValues();
    setLocalFilters({
      ...defaultValues,
      ...filters,
      fromTime: filters.fromTime ?? defaultValues.fromTime,
      toTime: filters.toTime ?? defaultValues.toTime,
    });
  }, [filters]);

  const loadDictionaries = useCallback(async () => {
    if (dictLoaded || loadingDicts) return;
    setLoadingDicts(true);
    try {
      const [msg, src] = await Promise.all([
        alarmApi.getMessages(),
        alarmApi.getSources(),
      ]);
      setMessages(msg);
      setSources(src);
      setDictLoaded(true);
    } finally {
      setLoadingDicts(false);
    }
  }, [dictLoaded, loadingDicts]);

  const handleToggleAdvancedFilter = () => {
    setShowAdvancedFilter((prev) => {
      const next = !prev;
      if (next) {
        void loadDictionaries();
      }
      return next;
    });
  };

  const handleApplyFilters = async () => {
    const payload: AlarmFilters = {
      ...localFilters,
      fromTime: useFromTime ? localFilters.fromTime : undefined,
      toTime: useToTime ? localFilters.toTime : undefined,
    };
    await refreshAlarms(payload);
  };

  const handleClearFilters = async () => {
    setLocalFilters(getDefaultFilterValues());
    setUseFromTime(false);
    setUseToTime(false);
    await refreshAlarms(EMPTY_FILTERS);
    setShowAdvancedFilter(false);
  };

  const renderAlarmTable = () => (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto pr-1"
        onScroll={() => {
          const el = listRef.current;
          if (!el) return;
          const firstRowHeight = firstRowHeightRef.current ?? 44;
          setShowScrollToTop(el.scrollTop > firstRowHeight);
          if (el.scrollTop > 0 && isAutoScrollRef.current) {
            setIsAutoScroll(false);
          }
          if (el.scrollTop <= 24 && !isAutoScrollRef.current) {
            setIsAutoScroll(true);
          }
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (distanceFromBottom < 200) {
            void loadMore();
          }
        }}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {['Mức độ ưu tiên', 'Loại', 'Mô tả', 'Nguồn', 'Vị trí', 'Trạng thái', 'Thời gian', 'Tương quan'].map((col) => (
                <th
                  key={col}
                  className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                  style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAlarms.map((alarm) => (
              <tr
                key={alarm.id}
                ref={alarm.id === filteredAlarms[0]?.id ? firstRowRef : undefined}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-bg2 border-b border-border-dim",
                  selectedAlarmId === alarm.id && "bg-[rgba(0,194,255,0.05)]",
                )}
                onClick={() => {
                  setSelectedAlarmId(alarm.id);
                  markAlarmAsRead(alarm.id);
                }}
              >
                <td className="py-2.5 px-3 align-middle text-[12px]"><StatusPill priority={alarm.pri} /></td>
                <td className="py-2.5 px-3 align-middle text-[12px]"><TypeBadge type={alarm.type} /></td>
                <td className="py-2.5 px-3 align-middle text-[12px]">
                  {alarm.title}
                  {alarm.isNew && <span className="ml-1.5 text-[9px] bg-psim-red text-white px-[6px] py-[1px] rounded-[3px] font-mono">NEW</span>}
                  {alarm.corr > 1 && <span className="ml-1.5 text-[9px] bg-[rgba(155,109,255,0.2)] text-purple px-[5px] py-[1px] rounded-[3px] font-mono">+{alarm.corr} corr</span>}
                </td>
                <td className="py-2.5 px-3 align-middle text-[11px] text-t-2">{alarm.src}</td>
                <td className="py-2.5 px-3 align-middle text-[11px] text-t-2">{alarm.loc}</td>
                <td className="py-2.5 px-3 align-middle text-[12px]">
                  {alarm.status === 'new' && <span className="px-2 py-0.5 rounded bg-psim-red/15 text-psim-red text-[10px] font-bold">{alarm.statusLabel ?? 'New'}</span>}
                  {alarm.status === 'in progress' && <span className="px-2 py-0.5 rounded bg-psim-orange/15 text-psim-orange text-[10px] font-bold">{alarm.statusLabel ?? 'In progress'}</span>}
                  {alarm.status === 'on hold' && <span className="px-2 py-0.5 rounded bg-psim-yellow/20 text-psim-yellow text-[10px] font-bold">{alarm.statusLabel ?? 'On hold'}</span>}
                  {alarm.status === 'close' && <span className="px-2 py-0.5 rounded bg-psim-green/20 text-psim-green text-[10px] font-bold">{alarm.statusLabel ?? 'Close'}</span>}
                  {!['new', 'in progress', 'on hold', 'close'].includes(alarm.status) && (
                    <span className="px-2 py-0.5 rounded bg-bg3 text-t1 text-[10px] font-bold">
                      {alarm.statusLabel ?? alarm.status}
                    </span>
                  )}
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
      {showScrollToTop && (
        <button
          type="button"
          className="absolute bottom-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-md border border-border-dim bg-bg3 text-[14px] text-t1 shadow-lg transition-colors hover:bg-bg4 hover:border-psim-accent hover:text-psim-accent"
          aria-label="Về đầu danh sách"
          title="Về đầu danh sách"
          onClick={() => {
            listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            clearBellCount();
            requestAnimationFrame(() => {
              setIsAutoScroll(true);
            });
          }}
        >
          ↑
        </button>
      )}
      </div>
      <div className="relative border-t border-border-dim bg-bg1 px-3 py-2 text-[11px]">
        <div className="font-mono text-t-2 text-center">
          Hiển thị {filteredAlarms.length} bản ghi
          {loading && <span className="text-psim-accent"> · Đang tải…</span>}
          {!loading && !canNextPage && alarms.length > 0 && <span className="text-t-2"> · Đã tải hết dữ liệu</span>}
        </div>

        {!isAutoScroll && pendingRealtimeCount > 0 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-psim-accent/50 bg-bg3 px-3 py-1.5 text-[11px] text-psim-accent shadow-lg hover:bg-bg4"
            onClick={() => {
              listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              clearBellCount();
              requestAnimationFrame(() => {
                setIsAutoScroll(true);
              });
            }}
          >
            Tạm dừng - Có {pendingRealtimeCount} tin mới - Click để Resume
          </button>
        )}
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
    <div className="flex flex-col h-full overflow-hidden font-sans">
      <header className="h-12 border-b border-white/5 bg-bg1 flex items-center px-3 shrink-0">
        <h1 className="text-[15px] font-semibold text-t-0 tracking-tight">
          Alarm Console
        </h1>
        <div className={cn(
          "w-2 h-2 mx-1 rounded-full",
          connected ? 'bg-psim-green' : 'bg-psim-red'
        )} title={connected ? 'SignalR connected' : 'SignalR disconnected'} />
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg2)', borderRadius: '7px', padding: '3px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`alarm-tab${activeTab === tab.value ? ' on' : ''}`}
              onClick={() => {
                void handleStatusTabClick(tab.value);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-t-2 font-mono ml-auto">
          {filteredAlarms.length} active · {alarms.filter(a => a.pri === 'critical').length} critical
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Alarm Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2.5 flex gap-2 items-center border-b border-border-dim shrink-0 flex-wrap bg-bg0">
            <AlarmSearchPanel
              isOpen={showAdvancedFilter}
              onToggle={handleToggleAdvancedFilter}
              filters={localFilters}
              onChangeFilters={(patch) =>
                setLocalFilters((prev) => ({ ...prev, ...patch }))
              }
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
              loading={loading || loadingDicts}
              messages={messages}
              sources={sources}
              useFromTime={useFromTime}
              useToTime={useToTime}
              onToggleUseFromTime={() => setUseFromTime((v) => !v)}
              onToggleUseToTime={() => setUseToTime((v) => !v)}
              showTrigger
              renderPanel={false}
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
          {showAdvancedFilter && (
            <div className="px-2.5 pb-2 border-b border-border-dim bg-bg0">
              <div className="w-full">
                <AlarmSearchPanel
                  isOpen={showAdvancedFilter}
                  onToggle={handleToggleAdvancedFilter}
                  filters={localFilters}
                  onChangeFilters={(patch) =>
                    setLocalFilters((prev) => ({ ...prev, ...patch }))
                  }
                  onApply={handleApplyFilters}
                  onClear={handleClearFilters}
                  loading={loading || loadingDicts}
                  messages={messages}
                  sources={sources}
                  useFromTime={useFromTime}
                  useToTime={useToTime}
                  onToggleUseFromTime={() => setUseFromTime((v) => !v)}
                  onToggleUseToTime={() => setUseToTime((v) => !v)}
                  showTrigger={false}
                />
              </div>
            </div>
          )}
          
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
