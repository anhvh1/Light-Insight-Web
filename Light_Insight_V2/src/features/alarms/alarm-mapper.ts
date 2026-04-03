import type { Alarm } from '@/types';

export interface SignalRAlarmPayload {
  alarmId?: string;
  alarmName?: string;
  location?: string;
  message?: string;
  priorityLevel?: number;
  priorityName?: string;
  source?: string;
  stateLevel?: number;
  stateName?: string;
  time?: string;
  type?: string;
}

let counter = 0;

function generateId(): string {
  counter += 1;
  return `ALM-${Date.now()}-${counter}`;
}

function formatDisplayTime(value?: string): string {
  if (!value) return '';

  const timeMatch = value.match(/\b\d{2}:\d{2}:\d{2}\b/);
  if (timeMatch) {
    return timeMatch[0];
  }

  return value;
}

export function normalizeAlarm(payload: SignalRAlarmPayload): Alarm {
  return {
    id: generateId(),
    title: payload.message ?? '',
    pri: (payload.priorityName ?? '').toLowerCase(),
    src: payload.source ?? '',
    status: (payload.stateName ?? '').toLowerCase(),
    time: formatDisplayTime(payload.time),
    type: 'light',
    typeLabel: payload.type?.trim() || 'Hệ thống',
    loc: '',
    corr: 0,
  };
}
