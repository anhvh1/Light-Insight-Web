import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  SearchIcon, 
  Filter, 
  X, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Phone,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { authApi } from '@/lib/auth-api';

interface UsersRolesSectionProps {
  getUserGradient: (name: string) => string;
}

export function UsersRolesSection({ getUserGradient }: UsersRolesSectionProps) {
  const queryClient = useQueryClient();
  
  // --- STATES ---
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPageSize] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    roleId: '',
    status: 'Active'
  });
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; status: number; message: string }>({
    isOpen: false,
    status: 0,
    message: ''
  });

  // --- API DATA FETCHING ---
  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-list', userSearch, userPage, userPageSize],
    queryFn: () => authApi.getUsers(userSearch, userPage, userPageSize),
  });

  const { data: rolesResponse } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => authApi.getRoles(),
  });
  const allRoles = rolesResponse?.Data || [];
  const allUsers = usersResponse?.Data || [];
  const totalUsers = usersResponse?.TotalRow || 0;

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchRole = !roleFilter || u.RoleName?.toLowerCase() === roleFilter.toLowerCase();
      const matchStatus = !statusFilter || u.Status?.toLowerCase() === statusFilter.toLowerCase();
      return matchRole && matchStatus;
    });
  }, [allUsers, roleFilter, statusFilter]);

  // --- API MUTATIONS ---
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      setResponseModal({
        isOpen: true,
        status: res.Status,
        message: res.Message || (res.Status === 1 ? 'Đăng ký thành công.' : 'Có lỗi xảy ra')
      });
      
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['users-list'] });
        setIsAddUserDialogOpen(false);
        setNewUserData({
          username: '',
          password: '',
          name: '',
          email: '',
          phone: '',
          roleId: '',
          status: 'Active'
        });
      }
    },
    onError: (err: any) => {
      setResponseModal({
        isOpen: true,
        status: -1,
        message: err.response?.data?.Message || 'Lỗi kết nối hệ thống'
      });
    }
  });

  const handleRegisterUser = () => {
    if (!newUserData.username || !newUserData.password || !newUserData.roleId) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc (*)');
      return;
    }
    registerMutation.mutate({
      Username: newUserData.username,
      Password: newUserData.password,
      Name: newUserData.name,
      Email: newUserData.email,
      PhoneNumber: newUserData.phone,
      Status: newUserData.status,
      RoleId: newUserData.roleId
    });
  };

  const ROLES_DISPLAY_DATA = [
    { 
      id: 'admin', name: '🔴 Admin', desc: 'Toàn quyền hệ thống', borderColor: 'border-[#ff3b5c]/25', textColor: 'text-psim-red',
      perms: [{ text: 'Xem tất cả dữ liệu', type: 'allow' }, { text: 'Cấu hình rule & SOP', type: 'allow' }, { text: 'Quản lý user & role', type: 'allow' }]
    },
    { 
      id: 'supervisor', name: '🟠 Supervisor', desc: 'Trưởng ca / Giám sát', borderColor: 'border-[#ff8c00]/20', textColor: 'text-psim-orange',
      perms: [{ text: 'Xem tất cả alarm & incident', type: 'allow' }, { text: 'Escalate & override SOP', type: 'allow' }, { text: 'Xem analytics & report', type: 'allow' }]
    },
    { 
      id: 'operator', name: '🔵 Operator', desc: 'Nhân viên trực ca', borderColor: 'border-[#00c2ff]/20', textColor: 'text-psim-accent',
      perms: [{ text: 'Xem & xử lý alarm/incident', type: 'allow' }, { text: 'Thực hiện SOP checklist', type: 'allow' }, { text: 'Giao việc guard', type: 'allow' }]
    },
    { 
      id: 'viewer', name: '⚪ Viewer', desc: 'Ban quản lý / Xem', borderColor: 'border-white/10', textColor: 'text-t-1',
      perms: [{ text: 'Xem dashboard & report', type: 'allow' }, { text: 'Xem camera live (read only)', type: 'allow' }, { text: 'Không xử lý alarm', type: 'deny' }]
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500 w-full h-full max-h-full overflow-hidden">
      {/* Header Section */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-[14px] font-heading font-bold text-t0">User & Role Management</h2>
            <p className="text-[12px] text-t-2 mt-1">‎ </p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddUserDialogOpen(true)}
          className="bg-psim-accent2 text-white font-bold text-[11px] uppercase tracking-wider gap-2 h-8 px-4 rounded flex items-center shadow-lg shadow-psim-accent2/20 hover:scale-[1.02] transition-all"
        >
          <Plus size={14} /> Thêm user
        </button>
      </div>

      {/* Role Grid */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {ROLES_DISPLAY_DATA.map(role => (
          <div key={role.id} className={cn("bg-bg-2 border rounded-lg p-4 flex flex-col gap-3 shadow-sm hover:border-white/10 transition-all", role.borderColor)}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className={cn("text-[13px] font-bold tracking-tight uppercase font-heading", role.textColor)}>{role.name}</h3>
                <p className="text-[11px] text-t-2 mt-0.5">{role.desc}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {role.perms.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-t-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.type === 'allow' ? "bg-psim-green" : "bg-psim-red")} />
                  <span className="opacity-80">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User Section Header */}
      <div className="mt-2 flex items-center justify-between border-b border-border-dim pb-2 shrink-0">
        <h3 className="text-[12px] font-bold text-t0 uppercase tracking-widest font-heading">Danh sách Users</h3>
        <div className="flex gap-2 relative">
           <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-2" size={13} />
              <input 
                className="bg-bg2 border border-border-dim rounded h-7 pl-8 pr-3 text-[10px] text-t-1 w-56 focus:border-psim-accent2/50 outline-none transition-all" 
                placeholder="Tìm tên" 
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
              />
           </div>
           <button 
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={cn(
              "h-7 w-7 rounded bg-bg2 border border-border-dim flex items-center justify-center transition-colors",
              (roleFilter || statusFilter) ? "text-psim-accent2 border-psim-accent2/30" : "text-t-2 hover:text-t-1"
            )}
           >
            <Filter size={13} />
           </button>

           {/* Filter Menu */}
           {showFilterMenu && (
             <div className="absolute top-9 right-0 w-56 bg-[#161b2e] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Filter size={14} className="text-psim-accent2" /> Bộ lọc
                    </span>
                    <button onClick={() => setShowFilterMenu(false)} className="text-t-2 hover:text-white"><X size={14} /></button>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest mb-1.5 block px-1">Role</label>
                    <select 
                      className="w-full bg-black/30 border border-white/10 rounded-lg h-9 px-3 text-[11px] text-white outline-none focus:border-psim-accent2/50 transition-all appearance-none cursor-pointer"
                      value={roleFilter || ''}
                      onChange={(e) => setRoleFilter(e.target.value || null)}
                    >
                      <option value="" className="bg-[#161b2e]">Tất cả Role</option>
                      {allRoles.map((r: any) => (
                        <option key={r.Id} value={r.Name} className="bg-[#161b2e]">{r.Name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest mb-1.5 block px-1">Trạng thái</label>
                    <select 
                      className="w-full bg-black/30 border border-white/10 rounded-lg h-9 px-3 text-[11px] text-white outline-none focus:border-psim-accent2/50 transition-all appearance-none cursor-pointer"
                      value={statusFilter || ''}
                      onChange={(e) => setStatusFilter(e.target.value || null)}
                    >
                      <option value="" className="bg-[#161b2e]">Tất cả trạng thái</option>
                      <option value="Active" className="bg-[#161b2e]">Active</option>
                      <option value="Inactive" className="bg-[#161b2e]">Inactive</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-white/5 mt-1 flex items-center justify-between">
                    <button 
                      onClick={() => { setRoleFilter(null); setStatusFilter(null); }}
                      className="text-[10px] px-4 py-1.5 font-bold bg-psim-red rounded-md hover:bg-red-400 transition-all uppercase tracking-tight"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* User Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-transparent border border-border-dim shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-psim-accent/30 scrollbar-track-transparent hover:scrollbar-thumb-psim-accent/50">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#121929] border-b border-border-dim">
                <th className="py-2 px-6 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[25%]">Tên / Username</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[20%]">Email / Phone</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[12%] text-center">Role</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[12%] text-center">Trạng thái</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[20%] text-center whitespace-nowrap">Đăng nhập</th>
                <th className="py-2 px-6 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[11%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim/30">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <RefreshCcw className="animate-spin text-psim-accent2 mx-auto mb-3" />
                    <span className="text-[10px] text-t-2 font-mono uppercase">Đang tải...</span>
                  </td>
                </tr>
              ) : filteredUsers.map((u, i) => (
                <tr key={i} className="hover:bg-psim-accent2/[0.03] transition-colors group h-10 bg-bg0">
                  <td className="py-1 px-6">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shadow-md shrink-0 uppercase bg-gradient-to-br",
                        getUserGradient(u.Name || u.Username)
                      )}>
                        {(u.Name || u.Username || 'US').slice(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="font-bold text-[11px] text-t-1 group-hover:text-psim-accent2 transition-colors uppercase truncate leading-tight">
                          {u.Name || u.Username}
                        </div>
                        <div className="text-[8px] text-t-2 font-mono opacity-50 truncate">@{u.Username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-1 px-4">
                    <div className="flex flex-col min-w-0">
                      <div className="text-[10px] text-t-2 font-mono truncate lowercase">{u.Email || 'No email'}</div>
                      <div className="text-[8px] text-t-2 font-mono opacity-50">{u.PhoneNumber || '--'}</div>
                    </div>
                  </td>
                  <td className="py-1 px-4 text-center">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight border",
                      u.RoleName === 'Admin' ? "bg-psim-red/10 text-psim-red border-psim-red/20" :
                      u.RoleName === 'Supervisor' ? "bg-psim-orange/10 text-psim-orange border-psim-orange/20" :
                      u.RoleName === 'Operator' ? "bg-psim-accent2/10 text-psim-accent2 border-psim-accent2/20" :
                      "bg-bg3 text-t-2 border-border-dim"
                    )}>
                      {u.RoleName}
                    </span>
                  </td>
                  <td className="py-1 px-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest",
                      u.Status?.toLowerCase() === 'active' ? "text-psim-green" : "text-psim-orange"
                    )}>
                      <span className={cn("w-1 h-1 rounded-full", u.Status?.toLowerCase() === 'active' ? "bg-psim-green animate-pulse shadow-[0_0_6px_var(--color-psim-green)]" : "bg-psim-orange")} />
                      {u.Status}
                    </span>
                  </td>
                  <td className="py-1 px-4 text-[9px] font-mono text-t-2 uppercase text-center whitespace-nowrap">
                    {u.LastLogin ? new Date(u.LastLogin).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--/--'}
                  </td>
                  <td className="py-1 px-6 text-right whitespace-nowrap">
                    <button className="px-2 py-0.5 bg-bg-4 border border-border-dim rounded text-[9px] font-bold text-t-1 uppercase hover:bg-bg3 hover:text-psim-accent2 transition-all shadow-sm">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoadingUsers && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center opacity-30">
                    <UserPlus size={40} className="mx-auto mb-4" />
                    <p className="text-[12px] uppercase font-bold tracking-widest">Không tìm thấy người dùng nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="bg-[#121929]/50 border-t border-border-dim px-6 py-2 flex items-center justify-between shrink-0">
            <div className="text-[10px] text-t-2 font-mono">
              Hiển thị <span className="text-t-1">{(userPage-1)*userPageSize + 1}</span> - <span className="text-t-1">{Math.min(userPage*userPageSize, totalUsers)}</span> / <span className="text-psim-accent2">{totalUsers}</span>
            </div>
            <div className="flex gap-1.5">
               <button 
                disabled={userPage === 1}
                onClick={() => setUserPage(p => p - 1)}
                className="w-6 h-6 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-t-1 disabled:opacity-30 disabled:hover:text-t-2 transition-colors"
               >
                 <ChevronLeft size={14} />
               </button>
               <div className="flex items-center px-2 text-[10px] font-bold text-white bg-bg3 border border-border-dim rounded min-w-[24px] justify-center">
                  {userPage}
               </div>
               <button 
                disabled={userPage * userPageSize >= totalUsers}
                onClick={() => setUserPage(p => p + 1)}
                className="w-6 h-6 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-t-1 disabled:opacity-30 disabled:hover:text-t-2 transition-colors"
               >
                 <ChevronRight size={14} />
               </button>
            </div>
        </div>
      </div>

      {/* --- ADD USER MODAL --- */}
      {isAddUserDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={() => setIsAddUserDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-8 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight">Thêm Người Dùng Mới</h3>
                <p className="text-[11px] text-t-2 mt-1">Cấp tài khoản truy cập hệ thống Light Insight</p>
              </div>
              <button onClick={() => setIsAddUserDialogOpen(false)} className="text-t-2 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Tài khoản (Username) <span className="text-psim-red">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                    <input 
                      className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all font-mono"
                      placeholder="vd: hung.tran"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Mật khẩu <span className="text-psim-red">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-11 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all"
                      placeholder="••••••••"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t-2 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Họ và tên</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all"
                  placeholder="vd: Trần Hùng"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Email liên hệ</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                  <input 
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all"
                    placeholder="hung.tran@lightjsc.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                    <input 
                      className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all font-mono"
                      placeholder="0987..."
                      value={newUserData.phone}
                      onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Vai trò (Role) <span className="text-psim-red">*</span></label>
                  <select 
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all appearance-none cursor-pointer"
                    value={newUserData.roleId}
                    onChange={(e) => setNewUserData({...newUserData, roleId: e.target.value})}
                  >
                    <option value="" disabled className="bg-[#161b2e]">-- Chọn vai trò --</option>
                    {allRoles.map((r: any) => (
                      <option key={r.Id} value={r.Id} className="bg-[#161b2e]">{r.Name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Trạng thái</label>
                <div className="flex gap-4 p-1">
                  <button 
                    onClick={() => setNewUserData({...newUserData, status: 'Active'})}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-bold transition-all", newUserData.status === 'Active' ? "bg-psim-green/20 border-psim-green text-psim-green" : "bg-black/20 border-white/10 text-t-2")}
                  >
                    <div className={cn("w-2 h-2 rounded-full", newUserData.status === 'Active' ? "bg-psim-green" : "bg-t2")} /> Active
                  </button>
                  <button 
                    onClick={() => setNewUserData({...newUserData, status: 'Inactive'})}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-bold transition-all", newUserData.status === 'Inactive' ? "bg-psim-red/20 border-psim-red text-psim-red" : "bg-black/20 border-white/10 text-t-2")}
                  >
                    <div className={cn("w-2 h-2 rounded-full", newUserData.status === 'Inactive' ? "bg-psim-red" : "bg-t2")} /> Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 border-t border-white/5 pt-8">
              <button 
                onClick={() => setIsAddUserDialogOpen(false)}
                className="flex-1 h-11 rounded-xl text-[11px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleRegisterUser}
                disabled={registerMutation.isPending}
                className="flex-[2] h-11 bg-psim-accent2 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-psim-accent2/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {registerMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                Tạo người dùng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RESPONSE NOTIFICATION MODAL --- */}
      {responseModal.isOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setResponseModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg",
                responseModal.status === 1 ? "bg-psim-green/20 text-psim-green shadow-psim-green/10" : "bg-psim-red/20 text-psim-red shadow-psim-red/10"
              )}>
                {responseModal.status === 1 ? <CheckCircle2 size={40} /> : <ShieldAlert size={40} />}
              </div>
              <h3 className="text-[18px] font-bold text-white uppercase tracking-tight mb-2">
                {responseModal.status === 1 ? 'Thành công' : 'Thông báo lỗi'}
              </h3>
              <p className="text-[13px] text-t-2 leading-relaxed mb-8">
                {responseModal.message}
              </p>
              <button 
                onClick={() => setResponseModal(prev => ({ ...prev, isOpen: false }))}
                className={cn(
                  "w-full h-12 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]",
                  responseModal.status === 1 ? "bg-psim-green text-bg0 shadow-lg shadow-psim-green/20" : "bg-psim-red text-white shadow-lg shadow-psim-red/20"
                )}
              >
                Xác nhận (OK)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
