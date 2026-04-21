import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Save,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  ClipboardList,
  RefreshCcw,
  Search,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { alarmApi } from '@/lib/alarm-api';
import { priorityApi } from '@/lib/priority-api';
import { sopApi } from '@/lib/sop-api';
import type { CameraDropdownOption, SopStep, SopTrigger } from '@/types';

const NEW_DRAFT_ID = '__new__';

const EXECUTION_TYPES: { value: string; label: string }[] = [
  { value: 'manual', label: 'Thủ công' },
  { value: 'auto', label: 'Tự động' },
  { value: 'confirm', label: 'Xác nhận' },
];

interface SopDraft {
  id: string | null;
  name: string;
  description: string;
  triggers: SopTrigger[];
  steps: SopStep[];
}

function emptyDraft(): SopDraft {
  return {
    id: null,
    name: '',
    description: '',
    triggers: [],
    steps: [],
  };
}

function normalizeSteps(steps: SopStep[]): SopStep[] {
  return steps.map((s, idx) => ({ ...s, step_order: idx + 1 }));
}

interface FlashMessage {
  type: 'success' | 'error';
  text: string;
}

export function SopBuilderSection() {
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SopDraft | null>(null);
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const connectorsQuery = useQuery({
    queryKey: ['connectors-list'],
    queryFn: priorityApi.getAllConnectors,
  });

  const selectedConnectorId = useMemo(() => {
    const firstConnector = (connectorsQuery.data?.Data ?? [])[0] as
      | { Id?: string; id?: string }
      | undefined;
    return firstConnector?.Id ?? firstConnector?.id ?? null;
  }, [connectorsQuery.data]);

  const cameraOptionsQuery = useQuery({
    queryKey: ['camera-dropdown', selectedConnectorId],
    queryFn: () => alarmApi.getCameraOptions(selectedConnectorId as string),
    enabled: !!selectedConnectorId,
  });

  const cameraOptions = useMemo(
    () => cameraOptionsQuery.data ?? [],
    [cameraOptionsQuery.data]
  );

  // --- List query ---
  const listQuery = useQuery({
    queryKey: ['sop-list', keyword],
    queryFn: () =>
      sopApi.getPaged({ Keyword: keyword, Page: 1, PageSize: 200 }),
  });

  const sopList = useMemo(() => listQuery.data?.Data ?? [], [listQuery.data]);

  // --- Detail query ---
  const detailEnabled =
    !!selectedId && selectedId !== NEW_DRAFT_ID;

  const detailQuery = useQuery({
    queryKey: ['sop-detail', selectedId],
    queryFn: () => sopApi.getById(selectedId as string),
    enabled: detailEnabled,
  });

  // --- Sync draft with selected SOP / new flow ---
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    if (selectedId === NEW_DRAFT_ID) {
      setDraft(emptyDraft());
      return;
    }
    const detail = detailQuery.data?.Data;
    if (detail && detail.id === selectedId) {
      setDraft({
        id: detail.id,
        name: detail.name ?? '',
        description: detail.description ?? '',
        triggers: (detail.triggers ?? []).map((t) => ({
          vms_camera_id: t.vms_camera_id ?? '',
          event_name: t.event_name ?? '',
        })),
        steps: normalizeSteps(
          (detail.steps ?? []).map((s) => ({
            id: s.id,
            step_order: s.step_order,
            step_name: s.step_name ?? '',
            execution_type: s.execution_type ?? 'manual',
            target_device_id: s.target_device_id ?? '',
            action_code: s.action_code ?? '',
            action_payload: s.action_payload ?? {},
          }))
        ),
      });
    }
  }, [selectedId, detailQuery.data]);

  // --- Auto dismiss flash ---
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: sopApi.create,
    onSuccess: (res) => {
      if (res.Status === 1) {
        setFlash({ type: 'success', text: 'Thêm SOP thành công.' });
        queryClient.invalidateQueries({ queryKey: ['sop-list'] });
        const newId = (res as any).Data as string | undefined;
        if (newId) setSelectedId(newId);
      } else {
        setFlash({
          type: 'error',
          text: res.Message || 'Không thể thêm SOP.',
        });
      }
    },
    onError: (err: any) => {
      setFlash({
        type: 'error',
        text:
          err?.response?.data?.Message ||
          err?.message ||
          'Lỗi khi thêm SOP.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: sopApi.update,
    onSuccess: (res) => {
      if (res.Status === 1) {
        setFlash({ type: 'success', text: 'Cập nhật SOP thành công.' });
        queryClient.invalidateQueries({ queryKey: ['sop-list'] });
        queryClient.invalidateQueries({ queryKey: ['sop-detail', selectedId] });
      } else {
        setFlash({
          type: 'error',
          text: res.Message || 'Không thể cập nhật SOP.',
        });
      }
    },
    onError: (err: any) => {
      setFlash({
        type: 'error',
        text:
          err?.response?.data?.Message ||
          err?.message ||
          'Lỗi khi cập nhật SOP.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sopApi.delete,
    onSuccess: (res, id) => {
      if (res.Status === 1) {
        setFlash({ type: 'success', text: 'Đã xóa SOP.' });
        queryClient.invalidateQueries({ queryKey: ['sop-list'] });
        if (selectedId === id) {
          setSelectedId(null);
          setDraft(null);
        }
      } else {
        setFlash({
          type: 'error',
          text: res.Message || 'Không thể xóa SOP.',
        });
      }
    },
    onError: (err: any) => {
      setFlash({
        type: 'error',
        text: err?.message || 'Lỗi khi xóa SOP.',
      });
    },
  });

  // --- Draft mutators ---
  const patchDraft = (patch: Partial<SopDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const addTrigger = () =>
    setDraft((d) =>
      d
        ? {
            ...d,
            triggers: [
              ...d.triggers,
              { vms_camera_id: '', event_name: '' },
            ],
          }
        : d
    );

  const updateTrigger = (idx: number, patch: Partial<SopTrigger>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            triggers: d.triggers.map((t, i) =>
              i === idx ? { ...t, ...patch } : t
            ),
          }
        : d
    );

  const removeTrigger = (idx: number) =>
    setDraft((d) =>
      d ? { ...d, triggers: d.triggers.filter((_, i) => i !== idx) } : d
    );

  const addStep = () =>
    setDraft((d) =>
      d
        ? {
            ...d,
            steps: normalizeSteps([
              ...d.steps,
              {
                step_order: d.steps.length + 1,
                step_name: '',
                execution_type: 'manual',
                target_device_id: '',
                action_code: '',
                action_payload: {},
              },
            ]),
          }
        : d
    );

  const updateStep = (idx: number, patch: Partial<SopStep>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            steps: d.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
          }
        : d
    );

  const removeStep = (idx: number) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            steps: normalizeSteps(d.steps.filter((_, i) => i !== idx)),
          }
        : d
    );

  const moveStep = (idx: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= d.steps.length) return d;
      const clone = [...d.steps];
      [clone[idx], clone[newIdx]] = [clone[newIdx], clone[idx]];
      return { ...d, steps: normalizeSteps(clone) };
    });

  // --- Save handler ---
  const handleSave = () => {
    if (!draft) return;

    const name = draft.name.trim();
    if (!name) {
      setFlash({ type: 'error', text: 'Tên SOP không được để trống.' });
      return;
    }

    const orders = draft.steps.map((s) => s.step_order);
    const dup = orders.find((o, i) => orders.indexOf(o) !== i);
    if (dup !== undefined) {
      setFlash({ type: 'error', text: `Step_order bị trùng: ${dup}.` });
      return;
    }

    const payloadTriggers = draft.triggers
      .map((t) => ({
        vms_camera_id: t.vms_camera_id.trim(),
        event_name: t.event_name.trim(),
      }))
      .filter((t) => t.vms_camera_id || t.event_name);

    const payloadSteps = normalizeSteps(draft.steps).map((s) => ({
      id: s.id,
      step_order: s.step_order,
      step_name: s.step_name.trim(),
      execution_type: s.execution_type || 'manual',
      target_device_id: s.target_device_id || null,
      action_code: s.action_code.trim(),
      action_payload: s.action_payload ?? {},
    }));

    const base = {
      Name: name,
      Description: draft.description.trim() || null,
      Triggers: payloadTriggers,
      Steps: payloadSteps,
    };

    if (draft.id) {
      updateMutation.mutate({ Id: draft.id, ...base });
    } else {
      createMutation.mutate(base);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Xóa SOP "${name}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  const filteredList = sopList; // Server-side search đã lọc theo keyword

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* LEFT: SOP list */}
      <aside className="w-[260px] shrink-0 flex flex-col bg-bg1 border border-white/5 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
          <h3 className="text-[11px] font-bold text-t-2 uppercase tracking-[0.2em]">
            Loại Incident
          </h3>
          <button
            onClick={() => listQuery.refetch()}
            className="p-1 hover:bg-white/5 rounded text-t-2 transition-colors"
            title="Tải lại"
          >
            <RefreshCcw
              size={12}
              className={listQuery.isFetching ? 'animate-spin' : ''}
            />
          </button>
        </div>

        <div className="p-3 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2"
              size={13}
            />
            <input
              className="w-full bg-black/20 border border-white/10 rounded-lg h-9 pl-9 pr-4 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all"
              placeholder="Tìm SOP theo tên"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 flex flex-col gap-1.5">
          {filteredList.map((sop) => {
            const active = selectedId === sop.Id;
            return (
              <div
                key={sop.Id}
                onClick={() => setSelectedId(sop.Id)}
                className={cn(
                  'group px-3 py-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between',
                  active
                    ? 'bg-psim-accent/15 border-psim-accent/20'
                    : 'bg-white/[0.02] border-white/5 hover:border-psim-accent/30 hover:bg-white/5'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-[12px] font-semibold truncate',
                      active ? 'text-psim-accent' : 'text-t-1'
                    )}
                  >
                    {sop.Name}
                  </div>
                  {sop.Description && (
                    <div className="text-[10px] text-t-2 truncate mt-0.5">
                      {sop.Description}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(sop.Id, sop.Name);
                  }}
                  className="ml-2 p-1 rounded text-t-2 hover:text-psim-red hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Xóa SOP"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}

          {!listQuery.isLoading && filteredList.length === 0 && (
            <div className="py-8 text-center opacity-30 text-[10px] uppercase font-bold tracking-widest">
              Chưa có SOP
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setSelectedId(NEW_DRAFT_ID);
          }}
          className="shrink-0 mx-3 mb-3 h-9 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-psim-accent/15 border border-psim-accent/20 text-psim-accent hover:bg-psim-accent/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Thêm loại mới
        </button>
      </aside>

      {/* RIGHT: Editor */}
      <main className="flex-1 flex flex-col bg-bg1 border border-white/5 rounded-xl overflow-hidden">
        {!draft ? (
          <EmptyEditorState />
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 text-t-2 text-[11px] font-bold uppercase tracking-widest shrink-0">
                <ClipboardList size={14} />
                SOP
              </div>
              <input
                value={draft.name}
                onChange={(e) => patchDraft({ name: e.target.value })}
                placeholder="Tên SOP (bắt buộc)"
                className="flex-1 bg-transparent text-[16px] font-bold text-white outline-none border-b border-white/10 focus:border-psim-accent/60 transition-all pb-1"
              />
              <button
                onClick={addStep}
                className="h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-t-1 hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Plus size={14} />
                Thêm bước
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-psim-accent text-bg0 hover:brightness-110 shadow-lg shadow-psim-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Save size={14} />
                {isSaving ? 'Đang lưu...' : 'Lưu SOP'}
              </button>
            </div>

            {/* Flash */}
            {flash && (
              <div
                className={cn(
                  'mx-5 mt-4 px-4 py-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-2 border',
                  flash.type === 'success'
                    ? 'bg-psim-green/10 border-psim-green/40 text-psim-green'
                    : 'bg-psim-red/10 border-psim-red/40 text-psim-red'
                )}
              >
                {flash.type === 'success' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                <span>{flash.text}</span>
                <button
                  onClick={() => setFlash(null)}
                  className="ml-auto text-current opacity-60 hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 flex flex-col gap-5">
              {/* Description */}
              <section>
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em] block mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    patchDraft({ description: e.target.value })
                  }
                  rows={2}
                  placeholder="Mô tả ngắn gọn SOP này xử lý tình huống gì..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-psim-accent/50 transition-all resize-none"
                />
              </section>

              {/* Triggers */}
              <TriggersEditor
                cameraOptions={cameraOptions}
                cameraLoading={cameraOptionsQuery.isLoading}
                triggers={draft.triggers}
                onAdd={addTrigger}
                onUpdate={updateTrigger}
                onRemove={removeTrigger}
              />

              {/* Steps */}
              <StepsEditor
                cameraOptions={cameraOptions}
                cameraLoading={cameraOptionsQuery.isLoading}
                steps={draft.steps}
                onAdd={addStep}
                onUpdate={updateStep}
                onRemove={removeStep}
                onMove={moveStep}
              />

            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ---------- Sub-components ----------

function EmptyEditorState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-3">
      <Zap size={42} />
      <div className="text-center">
        <div className="text-[13px] font-bold uppercase tracking-widest">
          Chưa chọn SOP
        </div>
        <div className="text-[11px] mt-1">
          Chọn 1 SOP ở cột trái hoặc bấm "Thêm loại mới" để bắt đầu.
        </div>
      </div>
    </div>
  );
}

interface TriggersEditorProps {
  cameraOptions: CameraDropdownOption[];
  cameraLoading: boolean;
  triggers: SopTrigger[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<SopTrigger>) => void;
  onRemove: (idx: number) => void;
}

function TriggersEditor({
  cameraOptions,
  cameraLoading,
  triggers,
  onAdd,
  onUpdate,
  onRemove,
}: TriggersEditorProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em]">
          Thiết bị kích hoạt SOP
        </label>
        <button
          onClick={onAdd}
          className="text-[10px] font-bold uppercase tracking-wider text-psim-accent hover:text-white transition-colors flex items-center gap-1"
        >
          <Plus size={12} />
          Thêm trigger
        </button>
      </div>

      {triggers.length === 0 ? (
        <div className="text-center text-[10px] uppercase tracking-widest text-t-2 opacity-40 py-4 border border-dashed border-white/10 rounded-lg">
          Chưa có trigger nào
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {triggers.map((t, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-white/[0.02] border border-white/5 rounded-lg p-2"
            >
              <select
                value={t.vms_camera_id}
                onChange={(e) =>
                  onUpdate(idx, { vms_camera_id: e.target.value })
                }
                disabled={cameraLoading || cameraOptions.length === 0}
                className="bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-60"
              >
                <option value="" className="bg-[#161b2e]">
                  {cameraLoading
                    ? 'Đang tải camera...'
                    : cameraOptions.length === 0
                      ? 'Chưa có camera'
                      : 'Chọn camera kích hoạt'}
                </option>
                {t.vms_camera_id &&
                  !cameraOptions.some((camera) => camera.id === t.vms_camera_id) && (
                    <option value={t.vms_camera_id} className="bg-[#161b2e]">
                      {t.vms_camera_id}
                    </option>
                  )}
                {cameraOptions.map((camera) => (
                  <option
                    key={camera.id}
                    value={camera.id}
                    className="bg-[#161b2e]"
                  >
                    {camera.name}
                  </option>
                ))}
              </select>
              <input
                value={t.event_name}
                onChange={(e) =>
                  onUpdate(idx, { event_name: e.target.value })
                }
                placeholder="Event name (vd: LPR_UNKNOWN)"
                className="bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all"
              />
              <button
                onClick={() => onRemove(idx)}
                className="h-8 w-8 flex items-center justify-center rounded text-t-2 hover:text-psim-red hover:bg-white/5 transition-colors"
                title="Xóa trigger"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface StepsEditorProps {
  cameraOptions: CameraDropdownOption[];
  cameraLoading: boolean;
  steps: SopStep[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<SopStep>) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}

function StepsEditor({
  cameraOptions,
  cameraLoading,
  steps,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: StepsEditorProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em]">
          Các bước xử lý
        </label>
        <button
          onClick={onAdd}
          className="text-[10px] font-bold uppercase tracking-wider text-psim-accent hover:text-white transition-colors flex items-center gap-1"
        >
          <Plus size={12} />
          Thêm bước
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center text-[10px] uppercase tracking-widest text-t-2 opacity-40 py-4 border border-dashed border-white/10 rounded-lg">
          Chưa có bước nào
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex items-start gap-3"
            >
              <div className="shrink-0 h-7 w-7 rounded-full bg-psim-accent/15 border border-psim-accent/20 text-psim-accent text-[12px] font-bold flex items-center justify-center mt-0.5">
                {s.step_order}
              </div>

              <div className="flex-1 grid grid-cols-12 gap-2">
                <input
                  value={s.step_name}
                  onChange={(e) =>
                    onUpdate(idx, { step_name: e.target.value })
                  }
                  placeholder="Tên bước (vd: Kiểm tra biển số với whitelist BMS)"
                  className="col-span-12 bg-black/20 border border-white/10 rounded h-8 px-2 text-[12px] text-white outline-none focus:border-psim-accent/50 transition-all"
                />

                <select
                  value={s.execution_type}
                  onChange={(e) =>
                    onUpdate(idx, { execution_type: e.target.value })
                  }
                  className="col-span-3 bg-black/40 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all cursor-pointer"
                >
                  {EXECUTION_TYPES.map((t) => (
                    <option
                      key={t.value}
                      value={t.value}
                      className="bg-[#161b2e]"
                    >
                      {t.label}
                    </option>
                  ))}
                </select>

                <select
                  value={s.target_device_id ?? ''}
                  onChange={(e) =>
                    onUpdate(idx, {
                      target_device_id: e.target.value || null,
                    })
                  }
                  disabled={cameraLoading || cameraOptions.length === 0}
                  className="col-span-5 bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all cursor-pointer disabled:opacity-60"
                >
                  <option value="" className="bg-[#161b2e]">
                    {cameraLoading
                      ? 'Đang tải camera...'
                      : cameraOptions.length === 0
                        ? 'Chưa có camera'
                        : 'Chọn thiết bị'}
                  </option>
                  {s.target_device_id &&
                    !cameraOptions.some(
                      (camera) => camera.id === s.target_device_id
                    ) && (
                      <option
                        value={s.target_device_id}
                        className="bg-[#161b2e]"
                      >
                        {s.target_device_id}
                      </option>
                    )}
                  {cameraOptions.map((camera) => (
                    <option
                      key={camera.id}
                      value={camera.id}
                      className="bg-[#161b2e]"
                    >
                      {camera.name}
                    </option>
                  ))}
                </select>

                <input
                  value={s.action_code}
                  onChange={(e) =>
                    onUpdate(idx, { action_code: e.target.value })
                  }
                  placeholder="Action code"
                  className="col-span-4 bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all"
                />
              </div>

              <div className="shrink-0 flex flex-col gap-1">
                <button
                  onClick={() => onMove(idx, -1)}
                  disabled={idx === 0}
                  className="h-6 w-6 flex items-center justify-center rounded text-t-2 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Lên"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => onMove(idx, 1)}
                  disabled={idx === steps.length - 1}
                  className="h-6 w-6 flex items-center justify-center rounded text-t-2 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Xuống"
                >
                  <ArrowDown size={12} />
                </button>
              </div>

              <button
                onClick={() => onRemove(idx)}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded text-t-2 hover:text-psim-red hover:bg-white/5 transition-colors"
                title="Xóa bước"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
