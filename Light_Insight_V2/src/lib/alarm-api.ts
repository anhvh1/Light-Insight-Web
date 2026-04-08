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

export interface AlarmFilters {
  priorityName?: 'Low' | 'Medium' | 'High';
  stateName?: 'New' | 'In progress' | 'On hold' | 'Closed';
  message?: string;
  source?: string;
  fromTime?: string;
  toTime?: string;
}

export interface AlarmPageQuery extends AlarmFilters {
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
        priorityName: query?.priorityName,
        stateName: query?.stateName,
        message: query?.message,
        source: query?.source,
        fromTime: query?.fromTime,
        toTime: query?.toTime,
      },
    });

    return extractAlarmRows(response.data);
  },

  getMessages: async (): Promise<string[]> => {
    const response = await apiClient.get('/Alarm/MessageDropdown');
    const data = response.data;
    if (!data) return [];
    if (Array.isArray(data)) return data as string[];
    if (Array.isArray((data as any).array)) return (data as any).array as string[];
    return [];
  },

  getSources: async (): Promise<Array<{ id: string; name: string }>> => {
    const response = await apiClient.get('/Alarm/CameraDropdown');
    const data = response.data;
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      id: item.id ?? item.Id ?? item.sourceId ?? '',
      name: item.name ?? item.Name ?? item.sourceName ?? '',
    })).filter((x: { id: string; name: string }) => x.id && x.name);
  },
};
