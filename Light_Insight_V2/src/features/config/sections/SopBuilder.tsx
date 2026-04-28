import { useEffect, useMemo, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { alarmApi } from '@/lib/alarm-api';
import { priorityApi } from '@/lib/priority-api';
import { sopApi } from '@/lib/sop-api';
import type { AnalyticsEvent, CameraDropdownOption, SopStep, SopTrigger } from '@/types';

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

interface ConnectorOption {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
}

interface FlashMessage {
  type: 'success' | 'error';
  text: string;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  neutralLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onNeutral?: () => void;
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

function cloneDraft(value: SopDraft | null): SopDraft | null {
  if (!value) return null;
  return JSON.parse(JSON.stringify(value)) as SopDraft;
}

export function SopBuilderSection() {
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SopDraft | null>(null);
  const [originalDraft, setOriginalDraft] = useState<SopDraft | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [pendingNavBlocker, setPendingNavBlocker] = useState<any>(null);

  const connectorsQuery = useQuery({
    queryKey: ['connectors-list'],
    queryFn: priorityApi.getAllConnectors,
  });

  const connectors = useMemo(
    () => (connectorsQuery.data?.Data ?? []) as ConnectorOption[],
    [connectorsQuery.data]
  );

  const triggerConnectorIds = useMemo(() => {
    const ids = (draft?.triggers ?? [])
      .map((trigger) => trigger.connector_id?.trim())
      .filter((id): id is string => !!id);
    return Array.from(new Set(ids));
  }, [draft?.triggers]);

  const triggerConnectorOptionQueries = useQueries({
    queries: triggerConnectorIds.map((connectorId) => ({
      queryKey: ['sop-trigger-options', connectorId],
      queryFn: async () => {
        const [cameras, eventsResponse] = await Promise.all([
          alarmApi.getCameraOptions(connectorId),
          priorityApi.getAnalyticsEvents(connectorId),
        ]);
        return { cameras, events: eventsResponse.Data ?? [] };
      },
      enabled: !!connectorId,
    })),
  });

  const triggerOptionsByConnector = useMemo(() => {
    const map = new Map<
      string,
      {
        cameras: CameraDropdownOption[];
        events: AnalyticsEvent[];
        camerasLoading: boolean;
        eventsLoading: boolean;
      }
    >();
    triggerConnectorIds.forEach((connectorId, idx) => {
      const query = triggerConnectorOptionQueries[idx];
      map.set(connectorId, {
        cameras: query?.data?.cameras ?? [],
        events: query?.data?.events ?? [],
        camerasLoading: query?.isLoading ?? false,
        eventsLoading: query?.isLoading ?? false,
      });
    });
    return map;
  }, [triggerConnectorIds, triggerConnectorOptionQueries]);

  const stepCameraOptions = useMemo(() => {
    const seen = new Set<string>();
    const merged: CameraDropdownOption[] = [];
    triggerConnectorIds.forEach((connectorId) => {
      const cameras = triggerOptionsByConnector.get(connectorId)?.cameras ?? [];
      cameras.forEach((camera) => {
        if (!camera.id || seen.has(camera.id)) return;
        seen.add(camera.id);
        merged.push(camera);
      });
    });
    return merged;
  }, [triggerConnectorIds, triggerOptionsByConnector]);

  const stepCameraLoading = useMemo(
    () =>
      triggerConnectorIds.length > 0 &&
      triggerConnectorIds.some(
        (connectorId) => triggerOptionsByConnector.get(connectorId)?.camerasLoading ?? false
      ),
    [triggerConnectorIds, triggerOptionsByConnector]
  );

  const listQuery = useQuery({
    queryKey: ['sop-list', keyword],
    queryFn: () => sopApi.getPaged({ Keyword: keyword, Page: 1, PageSize: 200 }),
  });

  const sopList = useMemo(() => listQuery.data?.Data ?? [], [listQuery.data]);
  const detailEnabled = !!selectedId && selectedId !== NEW_DRAFT_ID;

  const detailQuery = useQuery({
    queryKey: ['sop-detail', selectedId],
    queryFn: () => sopApi.getById(selectedId as string),
    enabled: detailEnabled,
  });

  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      setOriginalDraft(null);
      setIsEditing(false);
      return;
    }

    if (selectedId === NEW_DRAFT_ID) {
      const created = emptyDraft();
      setDraft(created);
      setOriginalDraft(cloneDraft(created));
      setIsEditing(true);
      return;
    }

    const detail = detailQuery.data?.Data;
    if (detail && detail.id === selectedId) {
      const loadedDraft: SopDraft = {
        id: detail.id,
        name: detail.name ?? '',
        description: detail.description ?? '',
        triggers: (detail.triggers ?? []).map((t) => ({
          id: t.id,
          connector_id: t.connector_id ?? '',
          camera_id: t.camera_id ?? '',
          event_id: t.event_id ?? '',
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
      };
      setDraft(loadedDraft);
      setOriginalDraft(cloneDraft(loadedDraft));
      setIsEditing(false);
    }
  }, [selectedId, detailQuery.data]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const isDirty = useMemo(() => {
    if (!isEditing || !draft || !originalDraft) return false;
    return JSON.stringify(draft) !== JSON.stringify(originalDraft);
  }, [draft, originalDraft, isEditing]);

  const closeDialog = () => setConfirmDialog(null);

  const proceedPendingActions = () => {
    if (pendingSelectId !== null) {
      setSelectedId(pendingSelectId);
      setPendingSelectId(null);
    }
    if (pendingNavBlocker) {
      pendingNavBlocker.proceed();
      setPendingNavBlocker(null);
    }
  };

  const createMutation = useMutation({
    mutationFn: sopApi.create,
    onSuccess: (res) => {
      if (res.Status === 1) {
        setFlash({ type: 'success', text: 'Thêm SOP thành công.' });
        queryClient.invalidateQueries({ queryKey: ['sop-list'] });
        const newId = (res as any).Data as string | undefined;
        if (newId) {
          setSelectedId(newId);
        }
        setIsEditing(false);
        setOriginalDraft(cloneDraft(draft));
        closeDialog();
        proceedPendingActions();
      } else {
        setFlash({ type: 'error', text: res.Message || 'Không thể thêm SOP.' });
      }
    },
    onError: (err: any) => {
      setFlash({
        type: 'error',
        text: err?.response?.data?.Message || err?.message || 'Lỗi khi thêm SOP.',
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
        setOriginalDraft(cloneDraft(draft));
        setIsEditing(false);
        closeDialog();
        proceedPendingActions();
      } else {
        setFlash({ type: 'error', text: res.Message || 'Không thể cập nhật SOP.' });
      }
    },
    onError: (err: any) => {
      setFlash({
        type: 'error',
        text: err?.response?.data?.Message || err?.message || 'Lỗi khi cập nhật SOP.',
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
          setOriginalDraft(null);
          setIsEditing(false);
        }
      } else {
        setFlash({ type: 'error', text: res.Message || 'Không thể xóa SOP.' });
      }
    },
    onError: (err: any) => {
      setFlash({ type: 'error', text: err?.message || 'Lỗi khi xóa SOP.' });
    },
  });

  const patchDraft = (patch: Partial<SopDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const addTrigger = () =>
    setDraft((d) =>
      d
        ? {
            ...d,
            triggers: [...d.triggers, { connector_id: '', camera_id: '', event_id: '' }],
          }
        : d
    );

  const updateTrigger = (idx: number, patch: Partial<SopTrigger>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            triggers: d.triggers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
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
        connector_id: t.connector_id,
        camera_id: t.camera_id,
        event_id: t.event_id,
      }))
      .filter((t) => t.connector_id && t.camera_id && t.event_id);

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
    setConfirmDialog({
      open: true,
      title: 'Xóa SOP',
      message: `Xóa SOP "${name}"? Thao tác này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
      onConfirm: () => {
        closeDialog();
        deleteMutation.mutate(id);
      },
      onCancel: closeDialog,
    });
  };

  const requestSelect = (id: string) => {
    if (!isDirty) {
      setSelectedId(id);
      return;
    }
    setPendingSelectId(id);
    setConfirmDialog({
      open: true,
      title: 'Bạn có thay đổi chưa lưu',
      message: 'Bạn muốn lưu thay đổi trước khi chuyển SOP không?',
      confirmLabel: 'Lưu',
      neutralLabel: 'Không lưu',
      cancelLabel: 'Hủy',
      onConfirm: () => handleSave(),
      onNeutral: () => {
        closeDialog();
        if (originalDraft) {
          setDraft(cloneDraft(originalDraft));
        }
        proceedPendingActions();
      },
      onCancel: () => {
        setPendingSelectId(null);
        closeDialog();
      },
    });
  };

  const blocker: any = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
    disabled: !isDirty,
    enableBeforeUnload: false,
  } as any);

  useEffect(() => {
    if (!blocker || blocker.status !== 'blocked' || !isDirty) return;
    setPendingNavBlocker(blocker);
    setConfirmDialog({
      open: true,
      title: 'Bạn có thay đổi chưa lưu',
      message: 'Bạn muốn lưu thay đổi trước khi rời trang không?',
      confirmLabel: 'Lưu',
      neutralLabel: 'Không lưu',
      cancelLabel: 'Hủy',
      onConfirm: () => handleSave(),
      onNeutral: () => {
        closeDialog();
        if (originalDraft) {
          setDraft(cloneDraft(originalDraft));
        }
        if (blocker.proceed) {
          blocker.proceed();
        }
        setPendingNavBlocker(null);
      },
      onCancel: () => {
        closeDialog();
        if (blocker.reset) {
          blocker.reset();
        }
        setPendingNavBlocker(null);
      },
    });
  }, [blocker, isDirty, originalDraft]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const filteredList = sopList;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-1 pb-3 shrink-0">
        <h2 className="text-[15px] font-bold text-white">Quản lý quy trình xử lý sự cố</h2>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <aside className="w-[260px] shrink-0 flex flex-col bg-bg1 border border-white/5 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <h3 className="text-[11px] font-bold text-t-2 uppercase tracking-[0.2em]">
              Danh sách SOP
            </h3>
            <button
              onClick={() => listQuery.refetch()}
              className="p-1 hover:bg-white/5 rounded text-t-2 transition-colors"
              title="Tải lại"
            >
              <RefreshCcw size={12} className={listQuery.isFetching ? 'animate-spin' : ''} />
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
                  onClick={() => requestSelect(sop.Id)}
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
                      <div className="text-[10px] text-t-2 truncate mt-0.5">{sop.Description}</div>
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
            onClick={() => requestSelect(NEW_DRAFT_ID)}
            className="shrink-0 mx-3 mb-3 h-9 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-psim-accent/15 border border-psim-accent/20 text-psim-accent hover:bg-psim-accent/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Thêm loại mới
          </button>
        </aside>

        <main className="flex-1 flex flex-col bg-bg1 border border-white/5 rounded-xl overflow-hidden">
          {!draft ? (
            <EmptyEditorState />
          ) : (
            <>
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 text-[16px] font-bold text-white shrink-0">
                  <ClipboardList size={15} />
                  SOP:
                </div>
                <input
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="Tên SOP (bắt buộc)"
                  disabled={!isEditing}
                  className="flex-1 bg-transparent text-[16px] font-bold text-white outline-none border-b border-white/10 focus:border-psim-accent/60 transition-all pb-1 disabled:opacity-100 disabled:text-white disabled:cursor-default"
                />
                {!isEditing ? (
                  <button
                    key="edit-mode-button"
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setIsEditing(true);
                    }}
                    className="h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-psim-accent text-bg0 hover:brightness-110 shadow-lg shadow-psim-accent/20 transition-all flex items-center gap-2"
                  >
                    <Pencil size={14} />
                    Chỉnh sửa
                  </button>
                ) : (
                  <button
                    key="cancel-mode-button"
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setDraft(cloneDraft(originalDraft));
                      setIsEditing(false);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="h-9 px-3 rounded-lg text-[12px] font-semibold tracking-normal normal-case bg-psim-red/15 border border-psim-red/30 text-psim-red hover:bg-psim-red/20 flex items-center gap-2 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none active:outline-none active:ring-0 [WebkitTapHighlightColor:transparent]"
                  >
                    <X size={14} />
                    Hủy
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className={cn(
                      'h-9 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-psim-accent text-bg0 shadow-lg shadow-psim-accent/20 transition-all flex items-center gap-2',
                      isDirty && !isSaving
                        ? 'hover:brightness-110'
                        : 'saturate-50 opacity-80 cursor-not-allowed'
                    )}
                  >
                    <Save size={14} />
                    {isSaving ? 'Đang lưu...' : 'Lưu SOP'}
                  </button>
                )}
              </div>

              {flash && (
                <div
                  className={cn(
                    'mx-5 mt-4 px-4 py-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-2 border',
                    flash.type === 'success'
                      ? 'bg-psim-green/10 border-psim-green/40 text-psim-green'
                      : 'bg-psim-red/10 border-psim-red/40 text-psim-red'
                  )}
                >
                  {flash.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{flash.text}</span>
                  <button
                    onClick={() => setFlash(null)}
                    className="ml-auto text-current opacity-60 hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 flex flex-col gap-5">
                <section>
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em] block mb-1.5">
                    Mô tả
                  </label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => patchDraft({ description: e.target.value })}
                    rows={2}
                    disabled={!isEditing}
                    placeholder="Mô tả ngắn gọn SOP này xử lý tình huống gì..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-psim-accent/50 transition-all resize-none disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
                  />
                </section>

                <TriggersEditor
                  readOnly={!isEditing}
                  triggerOptionsByConnector={triggerOptionsByConnector}
                  connectors={connectors}
                  connectorsLoading={connectorsQuery.isLoading}
                  triggers={draft.triggers}
                  onAdd={addTrigger}
                  onUpdate={updateTrigger}
                  onRemove={removeTrigger}
                />

                <StepsEditor
                  readOnly={!isEditing}
                  cameraOptions={stepCameraOptions}
                  cameraLoading={stepCameraLoading}
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

      <ConfirmDialog
        open={!!confirmDialog?.open}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        neutralLabel={confirmDialog?.neutralLabel}
        onConfirm={() => confirmDialog?.onConfirm?.()}
        onCancel={() => confirmDialog?.onCancel?.()}
        onNeutral={() => confirmDialog?.onNeutral?.()}
      />
    </div>
  );
}

function EmptyEditorState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-3">
      <Zap size={42} />
      <div className="text-center">
        <div className="text-[13px] font-bold uppercase tracking-widest">Chưa chọn SOP</div>
        <div className="text-[11px] mt-1">Chọn 1 SOP ở cột trái hoặc bấm "Thêm loại mới" để bắt đầu.</div>
      </div>
    </div>
  );
}

interface TriggersEditorProps {
  readOnly: boolean;
  triggerOptionsByConnector: Map<
    string,
    {
      cameras: CameraDropdownOption[];
      events: AnalyticsEvent[];
      camerasLoading: boolean;
      eventsLoading: boolean;
    }
  >;
  connectors: ConnectorOption[];
  connectorsLoading: boolean;
  triggers: SopTrigger[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<SopTrigger>) => void;
  onRemove: (idx: number) => void;
}

function TriggersEditor({
  readOnly,
  triggerOptionsByConnector,
  connectors,
  connectorsLoading,
  triggers,
  onAdd,
  onUpdate,
  onRemove,
}: TriggersEditorProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2 gap-3">
        <label className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em]">
          Thiết bị kích hoạt SOP
        </label>
        {!readOnly && (
          <button
            onClick={onAdd}
            className="text-[10px] font-bold uppercase tracking-wider text-psim-accent hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Thêm thiết bị kích hoạt
          </button>
        )}
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
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 bg-white/[0.02] border border-white/5 rounded-lg p-2"
            >
              <select
                value={t.connector_id}
                onChange={(e) =>
                  onUpdate(idx, { connector_id: e.target.value, camera_id: '', event_id: '' })
                }
                disabled={readOnly || connectorsLoading || connectors.length === 0}
                className="bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
              >
                <option value="" className="bg-[#161b2e]">
                  {connectorsLoading
                    ? 'Đang tải VMS...'
                    : connectors.length === 0
                      ? 'Chưa có hệ thống VMS'
                      : 'Chọn hệ thống VMS'}
                </option>
                {t.connector_id &&
                  !connectors.some((connector) => (connector.Id ?? connector.id ?? '') === t.connector_id) && (
                    <option value={t.connector_id} className="bg-[#161b2e]">
                      {t.connector_id}
                    </option>
                  )}
                {connectors.map((connector) => {
                  const id = connector.Id ?? connector.id ?? '';
                  const name = connector.Name ?? connector.name ?? id;
                  return (
                    <option key={id} value={id} className="bg-[#161b2e]">
                      {name}
                    </option>
                  );
                })}
              </select>
              <select
                value={t.camera_id}
                onChange={(e) => onUpdate(idx, { camera_id: e.target.value })}
                disabled={
                  readOnly ||
                  !t.connector_id ||
                  (triggerOptionsByConnector.get(t.connector_id)?.camerasLoading ?? false) ||
                  (triggerOptionsByConnector.get(t.connector_id)?.cameras.length ?? 0) === 0
                }
                className="bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
              >
                <option value="" className="bg-[#161b2e]">
                  {!t.connector_id
                    ? 'Chọn hệ thống VMS trước'
                    : triggerOptionsByConnector.get(t.connector_id)?.camerasLoading
                      ? 'Đang tải camera...'
                      : (triggerOptionsByConnector.get(t.connector_id)?.cameras.length ?? 0) === 0
                        ? 'Chưa có camera'
                        : 'Chọn camera kích hoạt'}
                </option>
                {t.camera_id &&
                  !(triggerOptionsByConnector.get(t.connector_id)?.cameras ?? []).some(
                    (camera) => camera.id === t.camera_id
                  ) && (
                    <option value={t.camera_id} className="bg-[#161b2e]">
                      {t.camera_id}
                    </option>
                  )}
                {(triggerOptionsByConnector.get(t.connector_id)?.cameras ?? []).map((camera) => (
                  <option key={camera.id} value={camera.id} className="bg-[#161b2e]">
                    {camera.name}
                  </option>
                ))}
              </select>
              <select
                value={t.event_id}
                onChange={(e) => onUpdate(idx, { event_id: e.target.value })}
                disabled={
                  readOnly ||
                  !t.connector_id ||
                  (triggerOptionsByConnector.get(t.connector_id)?.eventsLoading ?? false) ||
                  (triggerOptionsByConnector.get(t.connector_id)?.events.length ?? 0) === 0
                }
                className="bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
              >
                <option value="" className="bg-[#161b2e]">
                  {!t.connector_id
                    ? 'Chọn hệ thống VMS trước'
                    : triggerOptionsByConnector.get(t.connector_id)?.eventsLoading
                      ? 'Đang tải event...'
                      : (triggerOptionsByConnector.get(t.connector_id)?.events.length ?? 0) === 0
                        ? 'Chưa có event'
                        : 'Chọn event kích hoạt'}
                </option>
                {t.event_id &&
                  !(triggerOptionsByConnector.get(t.connector_id)?.events ?? []).some(
                    (eventItem) => eventItem.ID === t.event_id
                  ) && (
                    <option value={t.event_id} className="bg-[#161b2e]">
                      {t.event_id}
                    </option>
                  )}
                {(triggerOptionsByConnector.get(t.connector_id)?.events ?? []).map((eventItem) => (
                  <option key={eventItem.ID} value={eventItem.ID} className="bg-[#161b2e]">
                    {eventItem.Name}
                  </option>
                ))}
              </select>
              {!readOnly && (
                <button
                  onClick={() => onRemove(idx)}
                  className="h-8 w-8 flex items-center justify-center rounded text-t-2 hover:text-psim-red hover:bg-white/5 transition-colors"
                  title="Xóa trigger"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface StepsEditorProps {
  readOnly: boolean;
  cameraOptions: CameraDropdownOption[];
  cameraLoading: boolean;
  steps: SopStep[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<SopStep>) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}

function StepsEditor({
  readOnly,
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
        <label className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em]">Các bước xử lý</label>
        {!readOnly && (
          <button
            onClick={onAdd}
            className="text-[10px] font-bold uppercase tracking-wider text-psim-accent hover:text-white transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Thêm bước
          </button>
        )}
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
                  onChange={(e) => onUpdate(idx, { step_name: e.target.value })}
                  disabled={readOnly}
                  placeholder="Tên bước (vd: Kiểm tra biển số với whitelist BMS)"
                  className="col-span-12 bg-black/20 border border-white/10 rounded h-8 px-2 text-[12px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
                />

                <select
                  value={s.execution_type}
                  onChange={(e) => onUpdate(idx, { execution_type: e.target.value })}
                  disabled={readOnly}
                  className="col-span-3 bg-black/40 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
                >
                  {EXECUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-[#161b2e]">
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
                  disabled={readOnly || cameraLoading || cameraOptions.length === 0}
                  className="col-span-5 bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
                >
                  <option value="" className="bg-[#161b2e]">
                    {cameraLoading
                      ? 'Đang tải camera...'
                      : cameraOptions.length === 0
                        ? 'Chưa có camera'
                        : 'Chọn thiết bị'}
                  </option>
                  {s.target_device_id &&
                    !cameraOptions.some((camera) => camera.id === s.target_device_id) && (
                      <option value={s.target_device_id} className="bg-[#161b2e]">
                        {s.target_device_id}
                      </option>
                    )}
                  {cameraOptions.map((camera) => (
                    <option key={camera.id} value={camera.id} className="bg-[#161b2e]">
                      {camera.name}
                    </option>
                  ))}
                </select>

                <input
                  value={s.action_code}
                  onChange={(e) => onUpdate(idx, { action_code: e.target.value })}
                  disabled={readOnly}
                  placeholder="Action code"
                  className="col-span-4 bg-black/20 border border-white/10 rounded h-8 px-2 text-[11px] text-white outline-none focus:border-psim-accent/50 transition-all disabled:opacity-100 disabled:text-white disabled:bg-black/20 disabled:cursor-default"
                />
              </div>

              {!readOnly && (
                <>
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
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Đồng ý',
  cancelLabel = 'Hủy',
  neutralLabel,
  onConfirm,
  onCancel,
  onNeutral,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  neutralLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onNeutral?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg1 border border-white/10 rounded-xl shadow-2xl shadow-black/40 p-4">
        <div className="text-[14px] font-semibold text-white">{title}</div>
        <div className="mt-2 text-[12px] text-t-2 leading-relaxed">{message}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-psim-red/15 border border-psim-red/30 text-psim-red hover:bg-psim-red/20 transition-all"
          >
            {cancelLabel}
          </button>
          {neutralLabel && (
            <button
              onClick={onNeutral}
              className="h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-t-1 hover:bg-white/10 transition-all"
            >
              {neutralLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-psim-accent text-bg0 hover:brightness-110 transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
