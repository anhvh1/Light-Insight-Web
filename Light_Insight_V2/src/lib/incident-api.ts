import { apiClient } from './api-client';
import type {
  ApiResponse,
  IncidentApiItem,
  IncidentPagingParams,
} from '@/types';

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

function normalizeIncidentItem(raw: unknown): IncidentApiItem {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const sopId =
    getStringValue(source, ['sop_id', 'sopId', 'SopId']) ??
    (source.sop_id === null ||
    source.sopId === null ||
    source.SopId === null
      ? null
      : null);
  const userId =
    getStringValue(source, ['user_id', 'userId', 'UserId']) ??
    (source.user_id === null ||
    source.userId === null ||
    source.UserId === null
      ? null
      : null);

  return {
    id: getStringValue(source, ['id', 'Id', 'incident_id', 'IncidentId']) ?? '',
    sop_id: sopId,
    priority: getStringValue(source, ['priority', 'Priority']) ?? '',
    source_id:
      getStringValue(source, ['source_id', 'sourceId', 'SourceId']) ?? '',
    status: getStringValue(source, ['status', 'Status']) ?? '',
    type: getStringValue(source, ['type', 'Type']) ?? '',
    user_id: userId,
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
};
