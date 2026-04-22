import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusPill, TypeBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { alarmApi } from '@/lib/alarm-api';
import { incidentApi } from '@/lib/incident-api';
import { priorityApi } from '@/lib/priority-api';
import { sopApi } from '@/lib/sop-api';
import type { AlarmType, IncidentApiItem, SopDetail } from '@/types';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Link2,
  RefreshCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';

type IncidentTab = 'all' | 'NEW' | 'IN PROGRESS' | 'ON HOLD' | 'CLOSED';

const PAGE_SIZE = 30;

type StepProgressState = Record<string, boolean>;
interface ConnectorOption {
  Id?: string;
  id?: string;
}

function normalizeStatus(status?: string | null) {
  return (status || '').trim().toUpperCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function getStepProgressKey(incidentId?: string | null) {
  return `incident-sop-progress:${incidentId || 'unknown'}`;
}

function getStepKey(step: { id?: string; step_order: number }) {
  return step.id || `step-${step.step_order}`;
}

function mapIncidentTypeToBadge(type?: string | null): AlarmType {
  const key = (type || '').toLowerCase();
  if (key.includes('lpr')) return 'lpr';
  if (key.includes('access') || key.includes('acs')) return 'acs';
  if (key.includes('fire')) return 'fire';
  if (key.includes('bms')) return 'bms';
  if (key.includes('intrusion') || key.includes('ai') || key.includes('vmd')) return 'ai';
  return 'tech';
}

function getStatusBadge(status: string) {
  const key = normalizeStatus(status);
  if (key === 'NEW') {
    return (
      <span className="px-2 py-0.5 rounded bg-psim-red/15 text-psim-red text-[10px] font-bold">
        NEW
      </span>
    );
  }
  if (key === 'IN PROGRESS') {
    return (
      <span className="px-2 py-0.5 rounded bg-psim-orange/15 text-psim-orange text-[10px] font-bold">
        IN PROGRESS
      </span>
    );
  }
  if (key === 'ON HOLD') {
    return (
      <span className="px-2 py-0.5 rounded bg-psim-yellow/15 text-psim-yellow text-[10px] font-bold">
        ON HOLD
      </span>
    );
  }
  if (key === 'CLOSED') {
    return (
      <span className="px-2 py-0.5 rounded bg-psim-green/15 text-psim-green text-[10px] font-bold">
        CLOSED
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded bg-bg3 text-t-2 text-[10px] font-bold uppercase">
      {status || '--'}
    </span>
  );
}

export function IncidentManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<IncidentTab>('all');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null
  );
  const [stepProgress, setStepProgress] = useState<StepProgressState>({});
  const [selectedSopId, setSelectedSopId] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(t);
  }, [keyword]);

  const listQuery = useQuery({
    queryKey: ['incident-list', debouncedKeyword, activeTab, page],
    queryFn: () =>
      incidentApi.getPaged({
        Keyword: debouncedKeyword || undefined,
        Status: activeTab === 'all' ? '' : activeTab,
        Page: page,
        PageSize: PAGE_SIZE,
      }),
  });

  const incidents = useMemo(() => listQuery.data?.Data ?? [], [listQuery.data]);
  const totalRows = listQuery.data?.TotalRow ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    if (!incidents.length) {
      setSelectedIncidentId(null);
      return;
    }
    if (
      !selectedIncidentId ||
      !incidents.some((x) => x.id === selectedIncidentId)
    ) {
      setSelectedIncidentId(incidents[0].id);
    }
  }, [incidents, selectedIncidentId]);

  const detailQuery = useQuery({
    queryKey: ['incident-detail', selectedIncidentId],
    queryFn: () => incidentApi.getById(selectedIncidentId as string),
    enabled: !!selectedIncidentId,
  });

  const selectedIncident = useMemo<IncidentApiItem | null>(() => {
    const detail = detailQuery.data?.Data;
    if (detail) return detail;
    return incidents.find((x) => x.id === selectedIncidentId) ?? null;
  }, [detailQuery.data, incidents, selectedIncidentId]);

  const sopDetailQuery = useQuery({
    queryKey: ['incident-sop-detail', selectedIncident?.sop_id],
    queryFn: () => sopApi.getById(selectedIncident?.sop_id as string),
    enabled: !!selectedIncident?.sop_id,
  });

  const sopListQuery = useQuery({
    queryKey: ['incident-sop-list'],
    queryFn: () => sopApi.getPaged({ Page: 1, PageSize: 200 }),
    enabled: !!selectedIncident,
  });

  const connectorsQuery = useQuery({
    queryKey: ['connectors-list'],
    queryFn: priorityApi.getAllConnectors,
  });

  const defaultConnectorId = useMemo(() => {
    const list = (connectorsQuery.data?.Data ?? []) as ConnectorOption[];
    const first = list[0];
    return first?.Id ?? first?.id ?? null;
  }, [connectorsQuery.data]);

  const cameraOptionsQuery = useQuery({
    queryKey: ['incident-camera-dropdown', defaultConnectorId],
    queryFn: () => alarmApi.getCameraOptions(defaultConnectorId as string),
    enabled: !!defaultConnectorId,
  });

  const cameraNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const camera of cameraOptionsQuery.data ?? []) {
      map.set(camera.id, camera.name);
    }
    return map;
  }, [cameraOptionsQuery.data]);

  const assignSopMutation = useMutation({
    mutationFn: (sopId: string | null) =>
      incidentApi.update({
        Id: selectedIncident?.id || '',
        SourceId: selectedIncident?.source_id || '',
        Type: selectedIncident?.type || '',
        Priority: selectedIncident?.priority || null,
        Status: selectedIncident?.status || null,
        UserId: selectedIncident?.user_id || null,
        SopId: sopId,
      }),
    onSuccess: () => {
      if (!selectedIncident?.id) return;
      void queryClient.invalidateQueries({
        queryKey: ['incident-detail', selectedIncident.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['incident-list'],
      });
    },
  });

  const sopDetail = (sopDetailQuery.data?.Data || null) as SopDetail | null;
  const sopSteps = useMemo(
    () => [...(sopDetail?.steps ?? [])].sort((a, b) => a.step_order - b.step_order),
    [sopDetail?.steps]
  );

  const tabs: Array<{ value: IncidentTab; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'NEW', label: 'New' },
    { value: 'IN PROGRESS', label: 'In progress' },
    { value: 'ON HOLD', label: 'On hold' },
    { value: 'CLOSED', label: 'Closed' },
  ];

  useEffect(() => {
    if (!selectedIncident?.id) {
      setStepProgress({});
      return;
    }
    try {
      const raw = localStorage.getItem(getStepProgressKey(selectedIncident.id));
      setStepProgress(raw ? (JSON.parse(raw) as StepProgressState) : {});
    } catch {
      setStepProgress({});
    }
  }, [selectedIncident?.id]);

  useEffect(() => {
    if (!selectedIncident?.id) return;
    localStorage.setItem(
      getStepProgressKey(selectedIncident.id),
      JSON.stringify(stepProgress)
    );
  }, [selectedIncident?.id, stepProgress]);

  useEffect(() => {
    setSelectedSopId(selectedIncident?.sop_id || '');
  }, [selectedIncident?.id, selectedIncident?.sop_id]);

  const doneStepsCount = useMemo(
    () => sopSteps.filter((step) => !!stepProgress[getStepKey(step)]).length,
    [sopSteps, stepProgress]
  );

  const correlationItems = useMemo(() => {
    if (!sopDetail) return [];
    const rows: Array<{ id: string; name: string; sub: string; time: string; icon: string }> =
      [];
    const seen = new Set<string>();

    for (const trigger of sopDetail.triggers ?? []) {
      const id = (trigger.vms_camera_id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({
        id,
        name: cameraNameById.get(id) ?? id,
        sub: trigger.event_name || '',
        time: formatDateTime(selectedIncident?.created_at),
        icon: '🚨',
      });
    }
    for (const step of sopSteps) {
      const id = (step.target_device_id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({
        id,
        name: cameraNameById.get(id) ?? id,
        sub: step.action_code || '',
        time: formatDateTime(selectedIncident?.updated_at),
        icon: '📷',
      });
    }
    return rows;
  }, [selectedIncident?.created_at, selectedIncident?.updated_at, sopDetail, sopSteps, cameraNameById]);

  const toggleStep = (stepKey: string) =>
    setStepProgress((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));

  const renderIncidentDetail = () => (
    <div className="bg-bg0 overflow-y-auto p-5 flex flex-col gap-5 h-full min-w-[400px] border-l border-border-dim scrollbar-thin scrollbar-thumb-bg4">
      {!selectedIncident && !detailQuery.isFetching ? (
        <div className="flex flex-col items-center justify-center opacity-20 gap-4 py-24">
          <ShieldAlert size={64} strokeWidth={1} />
          <div className="text-center">
            <div className="text-[11px] uppercase font-bold tracking-[0.3em]">
              No Selection
            </div>
            <div className="text-[10px] text-t2 font-medium mt-1">
              Chọn một incident để xem chi tiết
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-mono text-psim-accent font-bold uppercase tracking-[0.2em]">
                #INC-{(selectedIncident?.id ?? 'missing-id').slice(0, 8)}
              </div>
              <h2 className="text-[16px] font-heading font-bold text-t0 leading-tight tracking-tight">
                {selectedIncident?.type || 'Incident'}
              </h2>
            </div>
            <StatusPill
              priority={selectedIncident?.priority || ''}
              className="text-[10px] px-3 shadow-lg"
            />
          </div>

          {/* Meta Grid */}
          <div className="shrink-0 grid grid-cols-2 gap-px bg-border-dim border border-border-dim rounded shadow-sm">
            {[
              {
                label: 'Source ID',
                val: selectedIncident?.source_id || '--',
                mono: true,
              },
              { label: 'Loại incident', val: selectedIncident?.type || '--' },
              {
                label: 'Thời gian',
                val: formatDateTime(selectedIncident?.created_at),
                mono: true,
              },
              {
                label: 'User ID',
                val: selectedIncident?.user_id || 'Chưa có người xử lý',
                mono: true,
              },
            ].map((m, i) => (
              <div key={i} className="bg-bg2 p-2.5 flex flex-col gap-1">
                <span className="text-[8px] text-t-2 font-mono uppercase tracking-widest">
                  {m.label}
                </span>
                <span
                  className={cn(
                    'text-[11px] font-bold leading-tight',
                    m.mono && 'font-mono',
                    'text-t-1'
                  )}
                >
                  {m.val}
                </span>
              </div>
            ))}
          </div>

          {correlationItems.length > 0 && (
            <div className="shrink-0 bg-bg2 rounded-md p-3 border border-[rgba(155,109,255,0.2)]">
              <div className="text-[10px] font-mono text-purple uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Link2 size={13} /> Correlation - {correlationItems.length} nguồn liên quan
              </div>
              <div className="flex flex-col gap-1.5">
                {correlationItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0 bg-[rgba(155,109,255,0.15)] text-purple">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium" title={item.name}>
                        {item.name}
                      </div>
                      {item.sub ? (
                        <div className="truncate text-[10px] text-t-2 font-mono" title={item.sub}>
                          {item.sub}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 font-mono text-[10px] text-t-2">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="shrink-0 bg-bg2/50 border border-border-dim rounded-lg p-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] text-white font-medium">
                SOP:
              </span>
              <select
                value={selectedSopId}
                onChange={(e) => setSelectedSopId(e.target.value)}
                className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
              >
                <option value="" className="bg-[#161b2e]">
                  Chưa gán SOP
                </option>
                {(sopListQuery.data?.Data ?? []).map((item) => (
                  <option key={item.Id} value={item.Id} className="bg-[#161b2e]">
                    {item.Name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={
                  selectedSopId === (selectedIncident?.sop_id || '') ||
                  assignSopMutation.isPending
                }
                onClick={() => {
                  assignSopMutation.mutate(selectedSopId || null);
                }}
                className="shrink-0 h-8 px-3 bg-psim-accent text-bg0 rounded text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assignSopMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>

            {assignSopMutation.isError && (
              <div className="text-[11px] text-psim-red">Không thể lưu SOP.</div>
            )}

            {selectedIncident?.sop_id && (
              <div className="border-t border-border-dim pt-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono text-t-2 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck size={12} className="text-psim-accent" />
                    Checklist
                  </div>
                  <span className="text-[10px] font-mono text-psim-accent font-bold bg-psim-accent/10 px-2 py-0.5 rounded-full">
                    {doneStepsCount} / {sopSteps.length || 0}
                  </span>
                </div>

                {!sopDetailQuery.isLoading && sopSteps.length === 0 ? (
                  <div className="text-[11px] text-t-2">SOP này chưa có step.</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {sopSteps.map((step) => {
                      const stepKey = getStepKey(step);
                      const checked = !!stepProgress[stepKey];
                      return (
                        <label
                          key={stepKey}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-bg2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-[#00d9a0]"
                            checked={checked}
                            onChange={() => toggleStep(stepKey)}
                          />
                          <span
                            className={cn(
                              'text-[12px] font-medium',
                              checked ? 'line-through text-t-2' : 'text-t-0'
                            )}
                          >
                            {step.step_name || `Step ${step.step_order}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 grid grid-cols-2 gap-1.5 pb-4">
            <button className="px-3.5 py-2 rounded-md text-[12px] font-medium bg-psim-accent text-bg0 hover:opacity-90 transition-colors">
              Giao việc Guard
            </button>
            <button className="px-3.5 py-2 rounded-md text-[12px] font-medium bg-bg3 text-t1 border border-border-dim hover:bg-bg4 transition-colors">
              Xem Camera Live
            </button>
            <button className="px-3.5 py-2 rounded-md text-[12px] font-medium bg-[rgba(255,204,0,0.15)] text-psim-yellow border border-[rgba(255,204,0,0.3)] hover:bg-[rgba(255,204,0,0.25)] transition-colors">
              Escalate
            </button>
            <button className="px-3.5 py-2 rounded-md text-[12px] font-medium bg-bg3 text-t1 border border-border-dim hover:bg-bg4 transition-colors">
              Xuất bằng chứng
            </button>
          </div>

          <div className="shrink-0 flex flex-col gap-3 pb-6">
            <h3 className="text-[10px] font-mono text-t-2 uppercase tracking-widest font-bold px-1">
              Audit Timeline
            </h3>
            <div className="flex flex-col gap-0 relative ml-2 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border-dim">
              {[
                {
                  t: 'Incident được tạo',
                  time: formatDateTime(selectedIncident?.created_at),
                  src: 'System',
                  on: true,
                },
                {
                  t: `Trạng thái hiện tại: ${selectedIncident?.status || '--'}`,
                  time: formatDateTime(selectedIncident?.updated_at),
                  src: 'Workflow',
                  on: true,
                },
                {
                  t: selectedIncident?.sop_id
                    ? 'Đã liên kết SOP'
                    : 'Chưa liên kết SOP',
                  time: '--',
                  src: 'SOP',
                  on: !!selectedIncident?.sop_id,
                },
              ].map((tl, i) => (
                <div key={i} className="relative pl-6 pb-4 flex flex-col gap-0.5 last:pb-0">
                  <div
                    className={cn(
                      'absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full z-10',
                      tl.on ? 'bg-psim-accent shadow-[0_0_8px_var(--accent)]' : 'bg-bg4'
                    )}
                  />
                  <div
                    className={cn(
                      'text-[12px] font-bold leading-none',
                      tl.on ? 'text-t-0' : 'text-t2'
                    )}
                  >
                    {tl.t}
                  </div>
                  <div className="text-[9px] font-mono text-t-2 uppercase">
                    {tl.time} · {tl.src}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      {/* Header */}
      <div className="p-3.5 flex items-center gap-3 border-b border-border-dim bg-bg0 shrink-0">
        <h1 className="text-[15px] font-semibold text-t-0 tracking-tight">
          Incident Management
        </h1>
        <div className="flex gap-0.5 bg-bg2 rounded-md p-0.5 ml-2 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn(
                'px-3 py-1 text-[11px] rounded-md cursor-pointer transition-colors',
                activeTab === tab.value
                  ? 'bg-bg4 text-t0'
                  : 'text-t2 hover:bg-bg3 hover:text-t1'
              )}
              onClick={() => {
                setActiveTab(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-t-2 font-mono ml-4 uppercase tracking-widest border-l border-border-dim pl-4">
          {totalRows} incidents
        </div>
        <button
          onClick={() => {
            void listQuery.refetch();
            if (selectedIncidentId) void detailQuery.refetch();
            if (selectedIncident?.sop_id) void sopDetailQuery.refetch();
          }}
          className="ml-auto px-3 py-1.5 bg-bg2 border border-border-dim text-t-1 rounded-md text-[11px] font-bold uppercase tracking-wider hover:bg-bg3 transition-colors flex items-center gap-1.5"
        >
          <RefreshCcw size={13} className={listQuery.isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Incident List */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg0">
          <div className="p-2.5 flex gap-2 items-center border-b border-border-dim shrink-0 bg-bg0">
            <div className="relative flex-1 max-w-[320px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-t2"
              />
              <input
                className="w-full bg-bg2 border border-border-dim rounded-md pl-9 pr-3 py-1.5 text-t0 text-[12px] outline-none focus:border-psim-accent transition-colors"
                placeholder="Tìm incident..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {listQuery.isError && (
              <div className="ml-auto text-[11px] text-psim-red flex items-center gap-1">
                <AlertCircle size={12} />
                Lỗi tải danh sách incident
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {listQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-t-2 text-[12px]">
                Đang tải dữ liệu...
              </div>
            ) : incidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-t-2 gap-2 opacity-40">
                <ShieldAlert size={30} />
                <span className="text-[11px] uppercase tracking-wider font-bold">
                  Không có incident
                </span>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th
                      className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                      style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                    >
                      ID
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                      style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                    >
                      Mức độ
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                      style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                    >
                      Loại
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                      style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                    >
                      Nguồn
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                      style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                    >
                      Trạng thái
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                      style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                    >
                      Created
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-mono uppercase tracking-wider border-b border-border-dim sticky top-0 z-10 whitespace-nowrap"
                      style={{ background: 'var(--bg1)', color: 'var(--t2)' }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => {
                    const selected = selectedIncidentId === inc.id;
                    return (
                      <tr
                        key={inc.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-bg2 border-b border-border-dim',
                          selected && 'bg-[rgba(0,194,255,0.05)]'
                        )}
                        onClick={() => setSelectedIncidentId(inc.id)}
                      >
                        <td className="py-2.5 px-3 align-middle text-[11px] font-mono text-psim-accent font-bold">
                          #INC-{inc.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-[12px]">
                          <StatusPill priority={inc.priority} />
                        </td>
                        <td className="py-2.5 px-3 align-middle text-[12px]">
                          <TypeBadge
                            type={mapIncidentTypeToBadge(inc.type)}
                            label={inc.type || '--'}
                          />
                        </td>
                        <td className="py-2.5 px-3 align-middle text-[11px] text-t-2 max-w-[220px] truncate">
                          {inc.source_id || '--'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-[12px]">
                          {getStatusBadge(inc.status)}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-[11px] text-t-2 font-mono">
                          {formatDateTime(inc.created_at)}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-t2">
                          <ChevronRight size={14} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="shrink-0 border-t border-border-dim bg-bg1 px-3 py-2 flex items-center justify-between">
            <div className="text-[10px] text-t-2 font-mono uppercase tracking-wider">
              Trang {page} / {totalPages}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2 rounded bg-bg2 border border-border-dim text-t-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg3 transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="h-7 px-2 rounded bg-bg2 border border-border-dim text-t-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg3 transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Detail Panel */}
        {renderIncidentDetail()}
      </div>
    </div>
  );
}
