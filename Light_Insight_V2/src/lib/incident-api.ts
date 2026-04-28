import { apiClient } from './api-client';
import type {
  ApiResponse,
  IncidentApiItem,
  IncidentPagingParams,
} from '@/types';

export interface IncidentUpdatePayload {
  Id: string;
  SourceId: string;
  Priority?: string | null;
  Status?: string | null;
  VmsId?: string | null;
  AlarmTime?: string | null;
  Description?: string | null;
  UserId?: string | null;
  SopId?: string | null;
}

export interface IncidentCreatePayload {
  Priority?: string | null;
  SourceId: string;
  Status?: string | null;
  VmsId?: string | null;
  AlarmTime?: string | null;
  Description?: string | null;
  UserId?: string | null;
  SopId?: string | null;
}

function getStringValue(
  source: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function getNullableStringValue(
  source: Record<string, unknown>,
  keys: string[]
): string | null {
  const value = getStringValue(source, keys);
  if (value !== null) return value;
  return keys.some((key) => source[key] === null) ? null : null;
}

function normalizeIncidentItem(raw: unknown): IncidentApiItem {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    id: getStringValue(source, ['id', 'Id', 'incident_id', 'IncidentId']) ?? '',
    sop_id: getNullableStringValue(source, ['sop_id', 'sopId', 'SopId']),
    priority: getStringValue(source, ['priority', 'Priority']) ?? '',
    source_id:
      getStringValue(source, ['source_id', 'sourceId', 'SourceId']) ?? '',
    status: getStringValue(source, ['status', 'Status']) ?? '',
    vms_id: getNullableStringValue(source, ['vms_id', 'vmsId', 'VmsId']),
    vms_name: getNullableStringValue(source, ['vms_name', 'vmsName', 'VmsName']),
    alarm_time: getNullableStringValue(source, ['alarm_time', 'alarmTime', 'AlarmTime']),
    description: getNullableStringValue(source, ['description', 'Description']),
    user_id: getNullableStringValue(source, ['user_id', 'userId', 'UserId']),
    created_at:
      getStringValue(source, ['created_at', 'createdAt', 'CreatedAt']) ?? '',
    updated_at:
      getStringValue(source, ['updated_at', 'updatedAt', 'UpdatedAt']) ?? '',
  };
}

function emptyIncidentPagingResponse(): ApiResponse<IncidentApiItem[]> {
  return {
    Status: 0,
    Message: '',
    MessageDetail: null,
    Data: [],
    TotalRow: 0,
  };
}

export const incidentApi = {
  create: async (payload: IncidentCreatePayload) => {
    try {
      const res = await apiClient.post<ApiResponse<string>>('/Incident/Add', payload);
      return (
        res.data || {
          Status: -1,
          Message: 'Create failed',
          MessageDetail: null,
          Data: '',
          TotalRow: 0,
        }
      );
    } catch (error) {
      throw error;
    }
  },

  getPaged: async (params: IncidentPagingParams = {}) => {
    const res = await apiClient.get<ApiResponse<IncidentApiItem[]>>(
      '/Incident/GetPaged',
      { params }
    );
    const payload = res.data || emptyIncidentPagingResponse();
    const rawItems = Array.isArray(payload.Data) ? payload.Data : [];
    const normalizedItems = rawItems.map((item) => normalizeIncidentItem(item));
    return {
      ...payload,
      Data: normalizedItems,
    };
  },

  getById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<IncidentApiItem | null>>(
      `/Incident/GetById/${id}`
    );
    const payload = res.data || {
      Status: 0,
      Message: '',
      MessageDetail: null,
      Data: null,
      TotalRow: 0,
    };
    const normalizedItem = payload.Data ? normalizeIncidentItem(payload.Data) : null;
    return {
      ...payload,
      Data: normalizedItem,
    };
  },

  update: async (payload: IncidentUpdatePayload) => {
    const res = await apiClient.put<ApiResponse<null>>('/Incident/Update', payload);
    return (
      res.data || {
        Status: -1,
        Message: 'Update failed',
        MessageDetail: null,
        Data: null,
        TotalRow: 0,
      }
    );
  },
};
