import type { AlarmFilters } from '@/lib/alarm-api';
import { cn } from '@/lib/utils';

type AlarmSearchPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  filters: AlarmFilters;
  onChangeFilters: (patch: Partial<AlarmFilters>) => void;
  onApply: () => void;
  onClear: () => void;
  loading?: boolean;
  messages: string[];
  sources: Array<{ id: string; name: string }>;
  useFromTime: boolean;
  useToTime: boolean;
  onToggleUseFromTime: () => void;
  onToggleUseToTime: () => void;
  showTrigger?: boolean;
  renderPanel?: boolean;
};

const PRIORITY_OPTIONS: AlarmFilters['priorityName'][] = ['Low', 'Medium', 'High'];
const STATE_OPTIONS: AlarmFilters['stateName'][] = ['New', 'In progress', 'On hold', 'Closed'];

export function AlarmSearchPanel(props: AlarmSearchPanelProps) {
  const {
    isOpen,
    onToggle,
    filters,
    onChangeFilters,
    onApply,
    onClear,
    loading,
    messages,
    sources,
    useFromTime,
    useToTime,
    onToggleUseFromTime,
    onToggleUseToTime,
    showTrigger = true,
    renderPanel = true,
  } = props;

  return (
    <div className={cn(showTrigger && !renderPanel ? 'w-auto shrink-0' : 'w-full')}>
      {showTrigger && (
        <button
          type="button"
          className={cn(
            'w-64 flex items-center justify-between gap-1.5 text-[12px] px-3 py-1.5 rounded-md border transition-colors',
            'border-border-dim bg-bg2 text-t1 hover:bg-bg3',
            isOpen && 'bg-psim-accent/15 border-psim-accent/40 text-psim-accent',
          )}
          onClick={onToggle}
        >
          <span className="truncate">🔎 Tìm alarm...</span>
          <span className="text-[10px] leading-none">{isOpen ? '▲' : '▼'}</span>
        </button>
      )}

      {isOpen && renderPanel && (
        <div className={cn("w-full rounded-md border border-border-dim bg-bg1 p-3 shadow-2xl flex flex-col gap-3", showTrigger && "mt-2")}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
            <div className="text-[10px] font-mono text-t-2 uppercase tracking-wider">Mức độ ưu tiên</div>
            <div className="text-[10px] font-mono text-t-2 uppercase tracking-wider">Mô tả</div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-t-2 uppercase tracking-wider">Từ thời gian</label>
              <input
                type="checkbox"
                className="alarm-filter-check"
                checked={useFromTime}
                onChange={onToggleUseFromTime}
              />
            </div>

            <select
              className="alarm-filter-control"
              value={filters.priorityName ?? ''}
              onChange={(e) =>
                onChangeFilters({
                  priorityName: (e.target.value || undefined) as AlarmFilters['priorityName'],
                })
              }
            >
              <option value="">-- Tất cả --</option>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              className="alarm-filter-control"
              value={filters.message ?? ''}
              onChange={(e) => onChangeFilters({ message: e.target.value || undefined })}
            >
              <option value="">-- Tất cả --</option>
              {messages.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              step={1}
              className="alarm-filter-control"
              value={filters.fromTime ?? ''}
              disabled={!useFromTime}
              onChange={(e) => onChangeFilters({ fromTime: e.target.value || undefined })}
            />

            <div className="text-[10px] font-mono text-t-2 uppercase tracking-wider">Trạng thái</div>
            <div className="text-[10px] font-mono text-t-2 uppercase tracking-wider">Nguồn</div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-t-2 uppercase tracking-wider">Đến thời gian</label>
              <input
                type="checkbox"
                className="alarm-filter-check"
                checked={useToTime}
                onChange={onToggleUseToTime}
              />
            </div>

            <select
              className="alarm-filter-control"
              value={filters.stateName ?? ''}
              onChange={(e) =>
                onChangeFilters({
                  stateName: (e.target.value || undefined) as AlarmFilters['stateName'],
                })
              }
            >
              <option value="">-- Tất cả --</option>
              {STATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              className="alarm-filter-control"
              value={filters.source ?? ''}
              onChange={(e) => onChangeFilters({ source: e.target.value || undefined })}
            >
              <option value="">-- Tất cả --</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              step={1}
              className="alarm-filter-control"
              value={filters.toTime ?? ''}
              disabled={!useToTime}
              onChange={(e) => onChangeFilters({ toTime: e.target.value || undefined })}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] rounded-md border border-border-dim bg-bg2 text-t1 hover:bg-bg3 hover:text-t0"
              onClick={onClear}
              disabled={loading}
            >
              Clear
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] rounded-md bg-psim-accent text-bg0 hover:opacity-90 rounded border border-psim-accent/60"
              onClick={onApply}
              disabled={loading}
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

