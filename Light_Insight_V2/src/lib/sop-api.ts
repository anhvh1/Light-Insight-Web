import { apiClient } from './api-client';
import type {
  ApiResponse,
  SopListItem,
  SopDetail,
  SopTrigger,
  SopStep,
} from '@/types';

export interface SopSavePayload {
  Id?: string;
  Name: string;
  Description: string | null;
  Triggers: SopTrigger[];
  Steps: SopStep[];
}

export interface SopPagingParams {
  Keyword?: string;
  Page?: number;
  PageSize?: number;
}

export const sopApi = {
  getPaged: async (params: SopPagingParams = {}) => {
    const res = await apiClient.get<ApiResponse<SopListItem[]>>(
      '/Sop/GetPaged',
      { params }
    );
    return (
      res.data || {
        Status: 0,
        Message: '',
        MessageDetail: null,
        Data: [] as SopListItem[],
        TotalRow: 0,
      }
    );
  },

  getById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<SopDetail>>(
      `/Sop/GetById/${id}`
    );
    return res.data;
  },

  create: async (data: Omit<SopSavePayload, 'Id'>) => {
    const res = await apiClient.post<ApiResponse<string>>('/Sop/Add', data);
    return res.data || { Status: -1, Message: 'Create failed' };
  },

  update: async (data: SopSavePayload & { Id: string }) => {
    const res = await apiClient.put<ApiResponse<null>>('/Sop/Update', data);
    return res.data || { Status: -1, Message: 'Update failed' };
  },

  delete: async (id: string) => {
    const res = await apiClient.delete<ApiResponse<null>>(`/Sop/Delete/${id}`);
    return res.data || { Status: -1, Message: 'Delete failed' };
  },
};
