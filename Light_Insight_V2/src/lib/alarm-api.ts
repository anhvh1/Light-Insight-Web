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
  cameraid?: string;
  cameraId?: string;
  cameraID?: string;
  CameraId?: string;
  CameraID?: string;
  connectorName?: string;
  timeUtc?: string;
  Time?: string;
}

export interface AlarmFilters {
  /** Connector Id — query param `key` for Milestone-backed alarm APIs */
  key?: string;
  /** Giá trị từ API Priorities/Priority (PriorityName), ví dụ LOW, MEDIUM, HIGH, CRITICAL */
  priorityName?: string;
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

function extractCameraNameList(payload: unknown): string[] {
  const rows: unknown[] = [];
  if (Array.isArray(payload)) {
    rows.push(...payload);
  } else if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const candidate of [obj.Data, obj.data, obj.array]) {
      if (Array.isArray(candidate)) {
        rows.push(...candidate);
        break;
      }
    }
  }
  return rows
    .map((item) => {
      const o = item as Record<string, unknown>;
      const n = o?.name ?? o?.Name ?? o?.sourceName;
      return typeof n === 'string' ? n.trim() : '';
    })
    .filter((n) => n.length > 0);
}

export const alarmApi = {
  getAll: async (query?: AlarmPageQuery) => {
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.max(1, query?.pageSize ?? 100);
    const start = (page - 1) * pageSize + 1; // 1-based range
    const end = page * pageSize;

    const params: Record<string, unknown> = {
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
    };
    if (query?.key) {
      params.key = query.key;
    }

    const response = await apiClient.get('/Alarm/GetAll', {
      params,
    });

    return extractAlarmRows(response.data);
  },

  getMessages: async (key: string): Promise<string[]> => {
    const response = await apiClient.get('/Alarm/MessageDropdown', {
      params: { key },
    });
    const data = response.data;
    if (!data) return [];
    if (Array.isArray(data)) return data as string[];
    if (Array.isArray((data as any).array)) return (data as any).array as string[];
    return [];
  },

  getSources: async (key: string): Promise<string[]> => {
    const response = await apiClient.get('/Alarm/CameraDropdown', {
      params: { key },
    });
    return extractCameraNameList(response.data);
  },
};
