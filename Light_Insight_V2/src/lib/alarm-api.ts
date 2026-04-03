import { apiClient } from './api-client';

export interface AlarmApiItem {
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

export interface AlarmPageQuery {
  page?: number;
  pageSize?: number;
}

function extractAlarmRows(payload: unknown): AlarmApiItem[] {
  if (Array.isArray(payload)) {
    return payload as AlarmApiItem[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const obj = payload as Record<string, unknown>;
  const candidates = [
    obj.Data,
    obj.data,
    obj.array,
    (obj.data as Record<string, unknown> | undefined)?.Data,
    (obj.data as Record<string, unknown> | undefined)?.data,
    (obj.Data as Record<string, unknown> | undefined)?.Data,
    (obj.Data as Record<string, unknown> | undefined)?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as AlarmApiItem[];
    }
  }

  return [];
}

export const alarmApi = {
  getAll: async (query?: AlarmPageQuery) => {
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.max(1, query?.pageSize ?? 100);
    const start = (page - 1) * pageSize + 1; // 1-based range
    const end = page * pageSize;

    const response = await apiClient.get('/Alarm/GetAll', {
      params: {
        page,
        pageNumber: page,
        pageSize,
        limit: pageSize,
        start,
        end,
        from: start,
        to: end,
        skip: start - 1,
        take: pageSize,
      },
    });

    return extractAlarmRows(response.data);
  },
};
