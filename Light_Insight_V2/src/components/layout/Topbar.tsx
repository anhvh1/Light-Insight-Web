import { useEffect, useState } from 'react';
import { authApi } from '@/lib/auth-api';
import { Link } from '@tanstack/react-router';

export function Topbar() {
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    // Lấy thông tin user từ JWT token
    const userInfo = authApi.getUserFromToken();
    setUser(userInfo);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toTimeString().slice(0, 8);
  const formattedDate = time.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).toUpperCase();

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      authApi.logout();
    }
  };

  return (
    <header className="h-12 bg-bg-1 border-b border-border flex items-center px-4 gap-3 z-100 shrink-0">
      <Link to="/" className="font-heading text-[15px] font-bold text-psim-accent flex items-center gap-2 whitespace-nowrap hover:opacity-80 transition-opacity">
        <img src="/lightjsc.png" className="max-h-6" alt="Logo"/>
      </Link>
      
      <span className="text-[11px] text-t-2 font-mono px-2.5 py-1 bg-bg-2 rounded border border-border">
        Times Square Đà Nẵng
      </span>

      <div className="ml-auto flex gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border bg-[rgba(255,59,92,0.12)] border-[rgba(255,59,92,0.3)] text-psim-red">
          <span className="w-1.25 h-1.25 rounded-full bg-psim-red animate-pulse" />
          3 Critical
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border bg-[rgba(255,140,0,0.12)] border-[rgba(255,140,0,0.3)] text-psim-orange">
          <span className="w-1.25 h-1.25 rounded-full bg-psim-orange animate-pulse" />
          7 High
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border bg-[rgba(0,214,143,0.12)] border-[rgba(0,214,143,0.3)] text-psim-green">
          <span className="w-1.25 h-1.25 rounded-full bg-psim-green animate-pulse" />
          System OK
        </div>
      </div>

      <div className="w-px h-7 bg-border-brighter mx-1" />

      <div className="flex flex-col items-end min-w-25">
        <div className="font-mono text-[18px] text-t-0 leading-tight tracking-wider">{formattedTime}</div>
        <div className="font-mono text-[10px] text-t-2 leading-none">{formattedDate}</div>
      </div>

      <div className="w-px h-7 bg-border-brighter mx-1" />

      <div 
        onClick={handleLogout}
        className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-border-brighter cursor-pointer hover:bg-bg-3 transition-colors group"
      >
        <div className="w-6.5 h-6.5 rounded-full bg-[linear-gradient(135deg,var(--accent2),var(--purple))] from-psim-accent to-purple flex items-center justify-center text-[11px] font-bold text-white uppercase">
          {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
        </div>
        <div>
          <div className="text-[12px] font-medium leading-none text-t-0 group-hover:text-psim-accent transition-colors">
            {user?.name || user?.username || 'Người dùng'}
          </div>
          <div className="text-[10px] text-t-2 font-mono leading-none mt-1 uppercase">
            {user?.roleName || 'OPERATOR'}
          </div>
        </div>
      </div>
    </header>
  );
}
