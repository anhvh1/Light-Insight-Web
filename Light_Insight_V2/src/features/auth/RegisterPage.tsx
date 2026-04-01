import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from '@tanstack/react-router';
import { User, Lock, Mail, Phone, BadgeCheck, Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/auth-api';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    ConfirmPassword: '',
    Name: '',
    Email: '',
    PhoneNumber: ''
  });
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: (data: any) => authApi.register(data),
    onSuccess: (response) => {
      if (response.Status === 1) {
        alert('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
        navigate({ to: '/login' });
      } else {
        alert(response.Message || 'Đăng ký thất bại.');
      }
    },
    onError: (error: any) => {
      console.error('Register error:', error);
      alert('Không thể kết nối đến máy chủ.');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Password !== formData.ConfirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    
    // Gửi dữ liệu theo PascalCase
    registerMutation.mutate({
      Username: formData.Username,
      Password: formData.Password,
      Name: formData.Name,
      Email: formData.Email,
      PhoneNumber: formData.PhoneNumber,
      RoleId: '00000000-0000-0000-0000-000000000000' // Giá trị mặc định hoặc lấy từ list
    });
  };

  return (
    <div className="min-h-screen w-full bg-bg-0 flex items-center justify-center p-4 font-sans text-t-0">
      <div className="w-full max-w-120 bg-bg-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-psim-accent to-purple shadow-[0_0_15px_rgba(0,194,255,0.3)]"></div>

        <div className="p-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs text-t-2 hover:text-psim-accent transition-colors mb-6 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Quay lại đăng nhập
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold font-heading text-white">Tạo tài khoản mới</h1>
            <p className="text-t-2 text-sm mt-1">Hệ thống giám sát LightInsight PSIM</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Tài khoản *</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors"><User size={16} /></div>
                <input name="Username" value={formData.Username} onChange={handleChange} type="text" placeholder="Tên đăng nhập..." className="w-full h-11 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:border-psim-accent/50 transition-all" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Mật khẩu *</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors"><Lock size={16} /></div>
                <input name="Password" value={formData.Password} onChange={handleChange} type="password" placeholder="••••••••" className="w-full h-11 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:border-psim-accent/50 transition-all" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Xác nhận *</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors"><BadgeCheck size={16} /></div>
                <input name="ConfirmPassword" value={formData.ConfirmPassword} onChange={handleChange} type="password" placeholder="••••••••" className="w-full h-11 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:border-psim-accent/50 transition-all" required />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Họ và tên</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors"><BadgeCheck size={16} /></div>
                <input name="Name" value={formData.Name} onChange={handleChange} type="text" placeholder="Nguyễn Văn A..." className="w-full h-11 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:border-psim-accent/50 transition-all" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors"><Mail size={16} /></div>
                <input name="Email" value={formData.Email} onChange={handleChange} type="email" placeholder="example@gmail.com" className="w-full h-11 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:border-psim-accent/50 transition-all" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Số điện thoại</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors"><Phone size={16} /></div>
                <input name="PhoneNumber" value={formData.PhoneNumber} onChange={handleChange} type="tel" placeholder="090..." className="w-full h-11 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:border-psim-accent/50 transition-all" />
              </div>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="md:col-span-2 w-full h-12 bg-psim-accent hover:bg-psim-accent2 text-bg-0 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
            >
              {registerMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'ĐĂNG KÝ TÀI KHOẢN'}
            </button>
          </form>
        </div>

        <div className="p-6 bg-bg-2/50 border-t border-white/5 text-center">
          <p className="text-xs text-t-2">Bạn đã có tài khoản? <Link to="/login" className="text-psim-accent hover:underline font-medium">Đăng nhập ngay</Link></p>
        </div>
      </div>
    </div>
  );
}
