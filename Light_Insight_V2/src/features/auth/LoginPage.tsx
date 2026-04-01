import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/auth-api';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Mutation xử lý Login bằng TanStack Query + authApi
  const loginMutation = useMutation({
    mutationFn: (data: any) => authApi.login(data),
    onSuccess: (response) => {
      // Backend trả về BaseResultModel { Status, Message, Data }
      if (response.Status === 1) {
        console.log('Login success:', response.Data);

        // Lưu token vào localStorage (Key 'auth_token' được dùng trong api-client interceptor)
        if (response.Data) {
          localStorage.setItem('auth_token', response.Data);
          // Bạn có thể lưu thêm thông tin user nếu cần
          localStorage.setItem('user_info', JSON.stringify({ username })); 
        }

        navigate({ to: '/' });
      } else {
        alert(response.Message || 'Đăng nhập thất bại.');
      }
    },
    onError: (error: any) => {
      console.error('Login error details:', error);
      alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại!');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ Username: username, Password: password });
  };


  return (
    <div className="min-h-screen w-full bg-bg-0 flex items-center justify-center p-4 font-sans text-t-0">
      {/* Container chính của Form */}
      <div className="w-full max-w-105 bg-bg-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Thanh accent màu xanh ở trên cùng */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-psim-accent shadow-[0_0_15px_rgba(0,194,255,0.5)]"></div>

        <div className="p-8 pt-12">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-bg-2 border border-white/5 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <img src="/lightjsc.png" alt="LightJSC Logo" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight text-white mb-1">LightInsight</h1>
            <p className="text-t-2 text-sm">Hệ thống quản lý an ninh tập trung</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Tài khoản */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Tài khoản</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Nhập tên đăng nhập..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-4 text-sm text-t-0 placeholder:text-t-2 focus:outline-none focus:border-psim-accent/50 focus:ring-2 focus:ring-psim-accent/10 transition-all"
                  required
                />
              </div>
            </div>

            {/* Input Mật khẩu */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-t-2 uppercase tracking-widest ml-1">Mật khẩu</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-t-2 group-focus-within:text-psim-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-bg-2 border border-white/10 rounded-xl pl-11 pr-12 text-sm text-t-0 placeholder:text-t-2 focus:outline-none focus:border-psim-accent/50 focus:ring-2 focus:ring-psim-accent/10 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-t-2 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Pass */}
            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-bg-3 accent-psim-accent" />
                <span className="text-t-2 group-hover:text-t-1 transition-colors">Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="text-psim-accent hover:underline font-medium">Quên mật khẩu?</a>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-psim-accent hover:bg-psim-accent2 text-bg-0 font-bold rounded-xl shadow-[0_4px_12px_rgba(0,194,255,0.25)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'ĐĂNG NHẬP HỆ THỐNG'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-bg-2/50 border-t border-white/5 flex flex-col items-center gap-1">
          <p className="text-[10px] text-t-2 font-mono uppercase tracking-tighter">Light Insight PSIM v2.0</p>
          <p className="text-[9px] text-t-2 opacity-50">&copy; 2026 LIGHT JSC. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </div>
  );
}
