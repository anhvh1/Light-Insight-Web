import type { Alarm } from '@/types';

export interface AlarmPayload {
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

function normalizePriority(priorityName?: string): string {
  const normalized = (priorityName ?? '').trim().toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'low') return 'low';
  return 'medium';
}

function normalizeStatus(stateName?: string): string {
  const normalized = (stateName ?? '').trim().toLowerCase();
  if (normalized === 'new') return 'new';
  if (normalized === 'ack' || normalized === 'acknowledged') return 'ack';
  if (normalized === 'prog' || normalized === 'in progress' || normalized === 'progress') return 'prog';
  return 'new';
}

function toAlarm(payload: AlarmPayload, isNew: boolean): Alarm {
  const id = payload.alarmId?.trim() || generateId();
  return {
    id,
    title: payload.message ?? payload.alarmName ?? '',
    pri: normalizePriority(payload.priorityName),
    src: payload.source ?? '',
    status: normalizeStatus(payload.stateName),
    time: formatDisplayTime(payload.time),
    type: 'light',
    typeLabel: payload.type?.trim() || 'Hệ thống',
    loc: payload.location ?? '',
    corr: 0,
    isNew,
  };
}

export function normalizeSignalRAlarm(payload: AlarmPayload): Alarm {
  return toAlarm(payload, true);
}

export function normalizeApiAlarm(payload: AlarmPayload): Alarm {
  return toAlarm(payload, false);
}
