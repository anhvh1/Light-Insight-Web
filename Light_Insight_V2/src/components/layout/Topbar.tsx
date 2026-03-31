import { useEffect, useState } from 'react';

export function Topbar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toTimeString().slice(0, 8);
  const formattedDate = time.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).toUpperCase();

  return (
    <header className="h-[48px] bg-bg-1 border-b border-border flex items-center px-4 gap-3 z-[100] shrink-0">
      <div className="font-heading text-[15px] font-bold text-psim-accent flex items-center gap-2 whitespace-nowrap">
        {/* <span className="w-[7px] h-[7px] rounded-full bg-psim-accent shadow-[0_0_8px_var(--accent)] animate-pulse" /> */}
        <img src="lightjsc.png" className="max-h-10"/>
      </div>
      
      <span className="text-[11px] text-t-2 font-mono px-2.5 py-1 bg-bg-2 rounded border border-border">
        Times Square Đà Nẵng
      </span>

      <div className="ml-auto flex gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border bg-[rgba(255,59,92,0.12)] border-[rgba(255,59,92,0.3)] text-psim-red">
          <span className="w-[5px] h-[5px] rounded-full bg-psim-red animate-pulse" />
          3 Critical
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border bg-[rgba(255,140,0,0.12)] border-[rgba(255,140,0,0.3)] text-psim-orange">
          <span className="w-[5px] h-[5px] rounded-full bg-psim-orange animate-pulse" />
          7 High
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border bg-[rgba(0,214,143,0.12)] border-[rgba(0,214,143,0.3)] text-psim-green">
          <span className="w-[5px] h-[5px] rounded-full bg-psim-green animate-pulse" />
          System OK
        </div>
      </div>

      <div className="w-[1px] h-7 bg-border-brighter mx-1" />

      <div className="flex flex-col items-end min-w-[100px]">
        <div className="font-mono text-[18px] text-t-0 leading-tight tracking-wider">{formattedTime}</div>
        <div className="font-mono text-[10px] text-t-2 leading-none">{formattedDate}</div>
      </div>

      <div className="w-[1px] h-7 bg-border-brighter mx-1" />

      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-border-brighter cursor-pointer hover:bg-bg-3 transition-colors">
        <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-psim-accent to-purple flex items-center justify-center text-[11px] font-bold text-white">
          TH
        </div>
        <div>
          <div className="text-[12px] font-medium leading-none">Trần Hùng</div>
          <div className="text-[10px] text-t-2 font-mono leading-none mt-1">OPERATOR · CA ĐÊM</div>
        </div>
      </div>
    </header>
  );
}
