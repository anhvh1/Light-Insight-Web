import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  RefreshCcw, 
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
  const [newConnector, setNewConnector] = useState({ id: '', name: '', vmsId: 0, ip: '', port: '', username: '', password: '' });
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
        setNewConnector({ id: '', name: '', vmsId: 0, ip: '', port: '', username: '', password: '' });
      }
    }
  });

  const updateConnectorMutation = useMutation({
    mutationFn: (data: any) => priorityApi.updateConnector(data),
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Cập nhật thành công' });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['connectors-list'] });
        setIsConnectorDialogOpen(false);
        setNewConnector({ id: '', name: '', vmsId: 0, ip: '', port: '', username: '', password: '' });
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

  // Lọc danh sách VMS: Nếu đang thêm mới thì loại bỏ các VMS đã tồn tại trong actualConnectors
  const filteredVmsList = isViewingDetails 
    ? vmsList 
    : vmsList.filter((v: any) => !actualConnectors.some((c: any) => c.VmsID === v.VmsId));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-[14px] font-heading font-bold text-t0">VMS & Device Connectors</h2>
          <p className="text-[12px] text-t-2 mt-1">Trạng thái kết nối API tới các hệ thống ngoại vi</p>
        </div>
        <button onClick={() => { setIsViewingDetails(false); setIsConnectorDialogOpen(true); }} className="bg-psim-accent2 text-white font-bold text-[11px] uppercase tracking-wider gap-2 h-8 px-4 rounded flex items-center shadow-lg shadow-psim-accent2/20 hover:scale-[1.02] transition-all">+ Thêm Connector</button>
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
                  <button className="flex-1 h-8 rounded bg-psim-accent2 border border-border-dim text-[11px] font-bold text-white hover:border-psim-accent/30 shadow-lg shadow-psim-accent2/20 hover:scale-[1.02] transition-all" onClick={() => {
                    setNewConnector({ id: c.Id, name: c.VmsName, vmsId: c.VmsID || 0, ip: c.IpServer, port: c.Port.toString(), username: c.Username, password: c.Password });
                    setIsViewingDetails(true); setIsConnectorDialogOpen(true);
                  }}>Chi tiết</button>
                  <button className="flex-1 h-8 rounded bg-bg2 border border-red-900/30 text-[11px] font-bold text-white hover:border-psim-red/50" onClick={() => setDeleteConfirmModal({ isOpen: true, id: c.Id, name: c.VmsName })}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {isConnectorDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsConnectorDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight">{isViewingDetails ? 'Chi tiết Connector' : 'Thêm Connector Mới'}</h3>
                <p className="text-[11px] text-t-2 mt-1">Cấu hình thông số kết nối tới hệ thống VMS.</p>
              </div>
              <button onClick={() => setIsConnectorDialogOpen(false)} className="text-t-2 hover:text-white transition-colors p-1"><X size={20} /></button>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Loại hệ thống (VMS)</label>
                <select 
                  className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all appearance-none cursor-pointer" 
                  value={newConnector.vmsId} 
                  onChange={(e) => setNewConnector({...newConnector, vmsId: parseInt(e.target.value)})}
                >
                  <option value={0} className="bg-[#161b2e]">-- Chọn VMS --</option>
                  {filteredVmsList.map((v: any) => (<option key={v.VmsId} value={v.VmsId} className="bg-[#161b2e]">{v.VmsName}</option>))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Địa chỉ IP</label>
                  <input 
                    className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all font-mono" 
                    placeholder="192.168.1.100" 
                    value={newConnector.ip} 
                    onChange={(e) => setNewConnector({...newConnector, ip: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Cổng (Port)</label>
                  <input 
                    className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all font-mono" 
                    placeholder="8080" 
                    value={newConnector.port} 
                    onChange={(e) => setNewConnector({...newConnector, port: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Tài khoản quản trị</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                  <input 
                    className="w-full bg-black/40 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all" 
                    placeholder="admin" 
                    value={newConnector.username} 
                    onChange={(e) => setNewConnector({...newConnector, username: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl h-12 pl-12 pr-12 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all font-mono" 
                    placeholder="••••••••" 
                    value={newConnector.password} 
                    onChange={(e) => setNewConnector({...newConnector, password: e.target.value})}
                  />
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-t-2 hover:text-white transition-colors" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setIsConnectorDialogOpen(false)}
                className="flex-1 h-12 rounded-xl text-[11px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                className="flex-[2] h-12 bg-psim-accent text-bg0 rounded-xl font-bold uppercase tracking-widest text-[12px] shadow-lg shadow-psim-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2" 
                onClick={() => {
                  const payload = { 
                    Id: newConnector.id,
                    IpServer: newConnector.ip, 
                    Port: parseInt(newConnector.port), 
                    Username: newConnector.username, 
                    Password: newConnector.password, 
                    VMSID: newConnector.vmsId,
                    Name: newConnector.name || 'Connector',
                    Status: 'Connected'
                  };
                  if (isViewingDetails) {
                    updateConnectorMutation.mutate(payload);
                  } else {
                    connectorMutation.mutate(payload);
                  }
                }}
                disabled={connectorMutation.isPending || updateConnectorMutation.isPending}
              >
                {(connectorMutation.isPending || updateConnectorMutation.isPending) && <RefreshCcw size={14} className="animate-spin" />}
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setDeleteConfirmModal({...deleteConfirmModal, isOpen: false})} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-psim-red/20 text-psim-red flex items-center justify-center mx-auto mb-6 shadow-lg shadow-psim-red/10 animate-pulse">
              <Trash2 size={36} />
            </div>
            <h3 className="text-white text-[18px] font-bold mb-2 uppercase tracking-tight">Xác nhận xóa?</h3>
            <p className="text-t-2 text-[13px] leading-relaxed mb-10 px-4">
              Bạn có chắc chắn muốn xóa connector <span className="text-white font-bold">"{deleteConfirmModal.name}"</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button 
                className="flex-1 h-12 rounded-xl border border-white/10 text-t-2 font-bold text-[11px] uppercase hover:bg-white/5 transition-all" 
                onClick={() => setDeleteConfirmModal({...deleteConfirmModal, isOpen: false})}
              >
                Hủy bỏ
              </button>
              <button 
                className="flex-[2] h-12 rounded-xl bg-psim-red text-white font-bold text-[11px] uppercase shadow-lg shadow-psim-red/20 hover:scale-[1.02] transition-all" 
                onClick={() => deleteConnectorMutation.mutate(deleteConfirmModal.id)}
                disabled={deleteConnectorMutation.isPending}
              >
                {deleteConnectorMutation.isPending ? <RefreshCcw size={14} className="animate-spin" /> : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSE NOTIF */}
      {responseModal.isOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setResponseModal({...responseModal, isOpen: false})} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg",
              responseModal.status === 1 ? "bg-psim-green/20 text-psim-green shadow-psim-green/10" : "bg-psim-red/20 text-psim-red shadow-psim-red/10"
            )}>
              {responseModal.status === 1 ? <CheckCircle2 size={40} /> : <ShieldAlert size={40} />}
            </div>
            <h3 className="text-white text-[18px] font-bold mb-2 uppercase tracking-tight">{responseModal.status === 1 ? 'Thành công' : 'Thông báo lỗi'}</h3>
            <p className="text-t-2 text-[13px] leading-relaxed mb-10 px-4">{responseModal.message}</p>
            <button 
              className={cn(
                "w-full h-12 rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg transition-all hover:scale-[1.02]",
                responseModal.status === 1 ? "bg-psim-accent text-bg0 shadow-psim-accent/20" : "bg-psim-red text-white shadow-psim-red/20"
              )} 
              onClick={() => setResponseModal({...responseModal, isOpen: false})}
            >
              Xác nhận (OK)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
