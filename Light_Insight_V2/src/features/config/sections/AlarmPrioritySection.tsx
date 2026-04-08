import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  RefreshCcw, 
  Sliders, 
  X, 
  SearchIcon, 
  Trash2,
  Check,
} from 'lucide-react';
import { priorityApi } from '@/lib/priority-api';
import { StatusPill } from '@/components/ui/status-badge';
import type { Priority } from '@/types';

interface AlarmPrioritySectionProps {
  actualConnectors: any[];
  // isLoadingConnectors: boolean;
}

export function AlarmPrioritySection({ actualConnectors }: AlarmPrioritySectionProps) {
  const queryClient = useQueryClient();
  
  // --- STATES ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [basket, setBasket] = useState<string[]>([]);
  const [selectedPriorityId, setSelectedPriorityId] = useState<number>(2);
  const [modalSearch, setModalSearch] = useState('');
  // const [editingMapping, setEditingMapping] = useState<{ id: number; name: string; currentPriorityId: number } | null>(null);
  // const [responseModal, setResponseModal] = useState<{ isOpen: boolean; status: number; message: string }>({
  //   isOpen: false,
  //   status: 0,
  //   message: ''
  // });

  // --- API DATA FETCHING ---
  const { data: priorities = [] } = useQuery({
    queryKey: ['priority-levels'],
    queryFn: priorityApi.getPriorityLevels,
    initialData: [
      { ID: 1, PriorityName: 'LOW' },
      { ID: 2, PriorityName: 'MEDIUM' },
      { ID: 3, PriorityName: 'HIGH' },
      { ID: 4, PriorityName: 'CRITICAL' }
    ]
  });

  const { data: allEventsResponse } = useQuery({
    queryKey: ['analytics-events'],
    queryFn: priorityApi.getAnalyticsEvents,
  });
  const allEvents = allEventsResponse?.Data || [];

  const { data: mappingsResponse, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['priority-mappings'],
    queryFn: priorityApi.getAllMappings,
  });
  const mappings = mappingsResponse?.Data || [];

  // --- MUTATIONS ---
  const insertMutation = useMutation({
    mutationFn: priorityApi.insertMapping,
    onSuccess: (res) => {
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['priority-mappings'] });
        setIsDialogOpen(false);
        setBasket([]);
      } else {
        alert(res.Message);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: priorityApi.deleteMapping,
    onSuccess: (res) => {
      if (res.Status === 1) queryClient.invalidateQueries({ queryKey: ['priority-mappings'] });
      else alert(res.Message);
    }
  });

  // const updateMutation = useMutation({
  //   mutationFn: ({ id, data }: { id: number; data: { ID: number; PriorityID: number } }) => 
  //     priorityApi.updateMapping(id, data),
  //   onSuccess: (res) => {
  //     if (res.Status === 1) {
  //       queryClient.invalidateQueries({ queryKey: ['priority-mappings'] });
  //       setEditingMapping(null);
  //     } else {
  //       alert(res.Message);
  //     }
  //   }
  // });

  const tableData = mappings.flatMap(m => 
    m.AnalyticsEvents.map(evtName => ({
      mappingId: m.ID,
      label: evtName,
      priority: m.PriorityName.toLowerCase() as Priority,
      priorityId: m.PriorityID
    }))
  ).reverse();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0 text-white uppercase tracking-tight">Alarm Priority Management (Live API)</h2>
          <p className="text-[12px] text-t-2 mt-1">Quản lý các quy tắc phân loại mức độ nghiêm trọng cho từng sự kiện AI</p>
        </div>
        <button 
          onClick={() => { setBasket([]); setIsDialogOpen(true); }}
          className="bg-psim-accent2 text-bg0 font-bold text-[11px] uppercase tracking-wider gap-2 h-10 px-6 rounded-md flex items-center shadow-lg shadow-psim-accent/20 hover:scale-[1.02] transition-all"
        >
          <Plus size={16} /> Tạo cấu hình mới
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-[#0d1220] border border-border-dim rounded-lg overflow-hidden shadow-sm flex flex-col">
        {isLoadingMappings ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
             <RefreshCcw className="animate-spin text-psim-accent" />
             <span className="text-t-2 font-mono text-[11px] uppercase tracking-widest">Đang tải...</span>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#121929] border-b border-border-dim">
                  <th className="py-4 px-6 text-[10px] font-mono text-t-2 uppercase tracking-widest w-16 text-center">STT</th>
                  <th className="py-4 px-2 text-[10px] font-mono text-t-2 uppercase tracking-widest">Analytics Event Name</th>
                  <th className="py-4 px-4 text-[10px] font-mono text-t-2 uppercase tracking-widest w-48 text-center">Assigned Priority</th>
                  <th className="py-4 px-6 text-[10px] font-mono text-t-2 uppercase tracking-widest w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dim/30">
                {tableData.map((c, index) => (
                  <tr key={`${c.mappingId}-${index}`} className="hover:bg-psim-accent/[0.02] transition-colors group h-16 bg-[#0d1220]">
                    <td className="py-3 px-6 font-mono text-[11px] text-t-2 text-center opacity-50">{index + 1}</td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-[13px] text-t-1 group-hover:text-psim-accent transition-colors uppercase truncate">{c.label}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                       <div className="flex justify-center">
                          <StatusPill priority={c.priority} className="w-32 shadow-lg uppercase" />
                       </div>
                    </td>
                    <td className="py-3 px-6 text-right">
                       <div className="flex justify-end gap-1.5 opacity-20 group-hover:opacity-100 transition-all">
                          {/* <button className="w-9 h-9 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-psim-accent" onClick={() => setEditingMapping({ id: c.mappingId, name: c.label, currentPriorityId: c.priorityId })}><Edit2 size={14} /></button> */}
                          <button className="w-9 h-9 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-psim-red" onClick={() => { if(confirm('Xóa?')) deleteMutation.mutate(c.mappingId); }}><Trash2 size={14} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 animate-in fade-in" onClick={() => setIsDialogOpen(false)} />
          <div className="relative w-full max-w-5xl bg-[#0d1220] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight flex items-center gap-3"><Sliders className="text-psim-accent" size={20} /> Thiết lập Priority hàng loạt</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Hệ thống:</span>
                  {actualConnectors.map((c: any) => (
                    <div key={c.Id} className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      <div className={cn("w-1 h-1 rounded-full", c.Status === 'Connected' ? "bg-psim-green shadow-[0_0_4px_var(--color-psim-green)]" : "bg-psim-orange")} />
                      <span className="text-[9px] font-bold text-t-1 uppercase">{c.VmsName}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setIsDialogOpen(false)} className="text-t-2 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex flex-col h-[550px] p-6 gap-6">
              <div className="text-center">
                <h4 className="text-[13px] font-bold text-white uppercase tracking-[0.2em]">Lựa chọn các Alarms chưa cấu hình</h4>
                <div className="h-0.5 w-12 bg-psim-accent mx-auto mt-1 rounded-full opacity-50" />
              </div>
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2" size={14} />
                  <input className="w-full bg-[#121929] border border-white/10 rounded-lg h-10 pl-10 pr-4 text-[12px] text-white outline-none" placeholder="Tìm kiếm sự kiện AI..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto ">
                <div className="grid grid-cols-3 gap-3">
                  {(() => {
                    const configuredEvents = new Set(mappings.flatMap(m => m.AnalyticsEvents));
                    return allEvents
                      .filter(a => !configuredEvents.has(a.Name) && a.Name.toLowerCase().includes(modalSearch.toLowerCase()))
                      .map((event) => (
                        <div key={event.ID} onClick={() => basket.includes(event.Name) ? setBasket(prev => prev.filter(x => x !== event.Name)) : setBasket(prev => [...prev, event.Name])} className={cn("p-3.5 rounded-lg border transition-all cursor-pointer flex gap-3 items-start group relative", basket.includes(event.Name) ? "bg-psim-accent/10 border-psim-accent shadow-xl" : "bg-[#121929] border-white/5 hover:bg-[#1a2236]")}>
                          <div className={cn("w-4.5 h-4.5 rounded border flex items-center justify-center mt-0.5 shrink-0", basket.includes(event.Name) ? "bg-psim-accent border-psim-accent text-[#070b14]" : "bg-[#1a2236] border-white/10 group-hover:border-psim-accent/50")}>{basket.includes(event.Name) && <Check size={12} strokeWidth={4} />}</div>
                          <div className="font-bold text-[12px] text-t-1 group-hover:text-white uppercase truncate">{event.Name}</div>
                          {basket.includes(event.Name) && <div className="absolute -top-1.5 -right-1.5 bg-psim-accent text-[#070b14] text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg uppercase">Selected</div>}
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-t-2 uppercase tracking-widest text-white">Thiết lập Priority: <span className="text-psim-accent ml-2">{basket.length} items</span></span>
                <div className="flex gap-2">
                   {priorities.map((p: any) => (
                     <button
                       key={p.ID}
                       onClick={() => setSelectedPriorityId(p.ID)}
                       className={cn(
                         "px-4 py-2 rounded text-[11px] font-bold border transition-all flex items-center gap-2",
                         selectedPriorityId === p.ID 
                           ? `${p.PriorityName === 'CRITICAL' ? 'bg-psim-red text-white border-transparent' : p.PriorityName === 'HIGH' ? 'bg-psim-orange text-white border-transparent' : p.PriorityName === 'MEDIUM' ? 'bg-psim-yellow text-bg0 border-transparent' : 'bg-bg4 text-t-1 border-white/20'} scale-105 shadow-xl` 
                           : "bg-[#121929] text-t-2 border-white/5 hover:border-white/20"
                       )}
                     >
                       ● {p.PriorityName}
                     </button>
                   ))}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsDialogOpen(false)} className="px-8 py-3 text-[11px] font-bold text-t-2 uppercase hover:text-white">Hủy bỏ</button>
                <button onClick={() => insertMutation.mutate({ PriorityID: selectedPriorityId, AnalyticsEvents: basket })} disabled={basket.length === 0 || insertMutation.isPending} className="px-12 py-3 bg-psim-accent text-bg0 font-bold text-[12px] uppercase rounded shadow-lg disabled:opacity-30">Lưu cấu hình</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
