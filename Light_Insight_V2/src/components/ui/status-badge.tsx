import { cn } from '@/lib/utils';
import type { AlarmType } from '@/types';
import React from 'react';

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: string;
}

const priorityClasses: Record<string, string> = {
  critical: 'bg-psim-red text-white',
  high: 'bg-psim-orange text-white',
  medium: 'bg-psim-yellow text-t-0',
  low: 'bg-t-2 text-t-0',
};

export function StatusPill({ priority, className, ...props }: StatusPillProps) {
  const key = (priority ?? '').toLowerCase().trim();
  const isUnset = !key || key === 'none';
  if (isUnset) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold",
        priorityClasses[key] ?? 'bg-bg3 text-t-2',
        className
      )}
      {...props}
    >
      ● {priority.toUpperCase()}
    </span>
  );
}

interface TypeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: AlarmType;
}

const typeClasses: Record<AlarmType, string> = {
  ai: 'bg-[rgba(155,109,255,0.2)] text-purple',
  lpr: 'bg-[rgba(0,229,204,0.15)] text-teal',
  acs: 'bg-[rgba(0,194,255,0.15)] text-psim-accent',
  fire: 'bg-[rgba(255,59,92,0.2)] text-psim-red',
  bms: 'bg-[rgba(255,140,0,0.15)] text-psim-orange',
  tech: 'bg-[rgba(255,255,255,0.08)] text-t-2',
  light: 'bg-[rgba(255,176,64,0.18)] text-[#ffb040]',
};

export function TypeBadge({ type, className, ...props }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-medium",
        typeClasses[type],
        className
      )}
      {...props}
    >
      {type.toUpperCase()}
    </span>
  );
}
