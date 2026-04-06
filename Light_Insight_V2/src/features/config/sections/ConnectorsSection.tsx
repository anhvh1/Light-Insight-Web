import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  RefreshCcw, 
  Plug2, 
  X, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Trash2,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { priorityApi } from '@/lib/priority-api';
import { Progress } from '@/components/ui/progress';

export function ConnectorsSection() {
  const queryClient = useQueryClient();
  const [isConnectorDialogOpen, setIsConnectorDialogOpen] = useState(false);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newConnector, setNewConnector] = useState({ name: '', vmsId: 0, ip: '', port: '', username: '', password: '' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; status: number; message: string }>({ isOpen: false, status: 0, message: '' });

  const { data: connectorsResponse, isLoading: isLoadingConnectors } = useQuery({
    queryKey: ['connectors-list'],
    queryFn: priorityApi.getAllConnectors,
  });
  const actualConnectors = connectorsResponse?.Data || [];

  const { data: vmsListResponse } = useQuery({
    queryKey: ['vms-list'],
    queryFn: priorityApi.getAllVMS,
  });
  const vmsList = vmsListResponse?.Data || [];

  const connectorMutation = useMutation({
    mutationFn: priorityApi.insertConnector,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Thành công' });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['connectors-list'] });
        setIsConnectorDialogOpen(false);
        setNewConnector({ name: '', vmsId: 0, ip: '', port: '', username: '', password: '' });
      }
    }
  });

  const deleteConnectorMutation = useMutation({
    mutationFn: priorityApi.deleteConnector,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Đã xóa' });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['connectors-list'] });
        setDeleteConfirmModal({ isOpen: false, id: '', name: '' });
      }
    }
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0 uppercase tracking-tight">VMS & Device Connectors (4.3)</h2>
          <p className="text-[12px] text-t-2 mt-1">Trạng thái kết nối API tới các hệ thống ngoại vi</p>
        </div>
        <button onClick={() => { setIsViewingDetails(false); setIsConnectorDialogOpen(true); }} className="px-4 py-1.5 bg-bg2 border border-border-dim rounded text-[11px] font-bold text-t-1 hover:bg-bg3">+ Thêm Connector</button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-psim-accent/30 pr-2">
        {isLoadingConnectors ? (
          <div className="py-24 text-center animate-pulse flex flex-col items-center gap-3">
             <RefreshCcw className="animate-spin text-psim-accent" /><span className="text-t-2 font-mono text-[11px] uppercase">Đang tải...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-6">
            {actualConnectors.map((c: any, i: number) => (
              <div key={c.Id || i} className="bg-bg1 border border-border-dim rounded-xl p-5 flex flex-col gap-4 hover:border-psim-accent/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[14px] font-bold text-white">{c.VmsName}</h3>
                    <p className="text-[10px] font-mono mt-1 opacity-60 text-t-2">{c.IpServer}:{c.Port}</p>
                  </div>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border uppercase", c.Status === 'Connected' ? "bg-psim-green/10 text-psim-green border-psim-green/30" : "bg-psim-orange/10 text-psim-orange border-psim-orange/30")}>{c.Status}</span>
                </div>
                <Progress value={c.Status === 'Connected' ? 100 : 0} className="h-1 bg-bg3" indicatorClassName={c.Status === 'Connected' ? "bg-psim-green" : "bg-psim-orange"} />
                <div className="flex gap-2">
                  <button className="flex-1 h-8 rounded bg-bg2 border border-border-dim text-[10px] font-bold text-t-1" onClick={() => {
                    setNewConnector({ name: c.VmsName, vmsId: c.VmsID || 0, ip: c.IpServer, port: c.Port.toString(), username: c.Username, password: c.Password });
                    setIsViewingDetails(true); setIsConnectorDialogOpen(true);
                  }}>Chi tiết</button>
                  <button className="flex-1 h-8 rounded bg-bg2 border border-red-900/30 text-[10px] font-bold text-t-2" onClick={() => setDeleteConfirmModal({ isOpen: true, id: c.Id, name: c.VmsName })}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {isConnectorDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90" onClick={() => setIsConnectorDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-8">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-[18px] font-bold text-white uppercase">{isViewingDetails ? 'Chi tiết Connector' : 'Thêm Connector Mới'}</h3>
              <button onClick={() => setIsConnectorDialogOpen(false)} className="text-t-2 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-5">
              <select className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-white" value={newConnector.vmsId} onChange={(e) => setNewConnector({...newConnector, vmsId: parseInt(e.target.value)})}>
                <option value={0}>-- Chọn VMS --</option>
                {vmsList.map((v: any) => (<option key={v.VmsId} value={v.VmsId}>{v.VmsName}</option>))}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-white" placeholder="IP" value={newConnector.ip} onChange={(e) => setNewConnector({...newConnector, ip: e.target.value})} />
                <input className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-white" placeholder="Port" value={newConnector.port} onChange={(e) => setNewConnector({...newConnector, port: e.target.value})} />
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                <input className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 text-white" placeholder="Username" value={newConnector.username} onChange={(e) => setNewConnector({...newConnector, username: e.target.value})} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                <input type={showPassword ? "text" : "password"} className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-11 text-white" placeholder="Password" value={newConnector.password} onChange={(e) => setNewConnector({...newConnector, password: e.target.value})} />
                <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t-2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            {!isViewingDetails && (
              <button className="w-full mt-8 h-11 bg-psim-accent text-bg0 rounded-lg font-bold uppercase" onClick={() => connectorMutation.mutate({ IpServer: newConnector.ip, Port: parseInt(newConnector.port), Username: newConnector.username, Password: newConnector.password, VMSID: newConnector.vmsId })}>Lưu cấu hình</button>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteConfirmModal({...deleteConfirmModal, isOpen: false})} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl p-8 text-center">
            <Trash2 size={40} className="mx-auto mb-4 text-psim-red" />
            <h3 className="text-white font-bold mb-2">Xác nhận xóa?</h3>
            <p className="text-t-2 text-[13px] mb-8">Xóa connector "{deleteConfirmModal.name}"?</p>
            <div className="flex gap-3">
              <button className="flex-1 h-12 rounded-xl border border-white/10 text-white" onClick={() => setDeleteConfirmModal({...deleteConfirmModal, isOpen: false})}>Hủy</button>
              <button className="flex-1 h-12 rounded-xl bg-psim-red text-white" onClick={() => deleteConnectorMutation.mutate(deleteConfirmModal.id)}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSE NOTIF */}
      {responseModal.isOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setResponseModal({...responseModal, isOpen: false})} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl p-8 text-center">
            {responseModal.status === 1 ? <CheckCircle2 size={40} className="mx-auto mb-4 text-psim-green" /> : <ShieldAlert size={40} className="mx-auto mb-4 text-psim-red" />}
            <h3 className="text-white font-bold mb-2">{responseModal.status === 1 ? 'Thành công' : 'Lỗi'}</h3>
            <p className="text-t-2 text-[13px] mb-8">{responseModal.message}</p>
            <button className="w-full h-12 rounded-xl bg-psim-accent text-bg0 font-bold" onClick={() => setResponseModal({...responseModal, isOpen: false})}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
