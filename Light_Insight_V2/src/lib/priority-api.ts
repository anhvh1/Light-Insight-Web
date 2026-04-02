import { apiClient } from './api-client';
import type { PriorityLevel, AnalyticsEvent, PriorityMapping, ApiResponse } from '@/types';

export const priorityApi = {
  getPriorityLevels: async () => {
    const response = await apiClient.get<PriorityLevel[]>('/Priorities/Priority');
    return response.data || [];
  },

  getAnalyticsEvents: async () => {
    const response = await apiClient.get<ApiResponse<AnalyticsEvent[]>>('/Priorities/AnalyticsEvents');
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  getAllMappings: async () => {
    const response = await apiClient.get<{ success: boolean; data: ApiResponse<PriorityMapping[]> }>('/Priorities/GetAll');
    return response.data?.data || { Data: [], Status: 0, Message: '' };
  },

  insertMapping: async (data: { PriorityID: number; AnalyticsEvents: string[] }) => {
    const response = await apiClient.post<ApiResponse<null>>('/Priorities/Insert', data);
    return response.data || { Status: -1, Message: 'Unknown error' };
  },

  // 5. Cập nhật Priority (PUT)
  updateMapping: async (id: number, data: { ID: number; PriorityID: number }) => {
    const response = await apiClient.put<ApiResponse<null>>(`/Priorities/${id}`, data);
    return response.data || { Status: -1, Message: 'Update failed' };
  },

  // 6. Xóa mapping (DELETE)
  deleteMapping: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/Priorities/${id}`);
    return response.data || { Status: -1, Message: 'Delete failed' };
  },

  // 7. Lấy danh sách VMS
  getAllVMS: async () => {
    const response = await apiClient.get<ApiResponse<{ VmsId: number; VmsName: string }[]>>('/Connectors/GetAllVMS');
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  // 8. Thêm Connector mới
  insertConnector: async (data: any) => {
    const response = await apiClient.post<ApiResponse<null>>('/Connectors/Connect', data);
    return response.data || { Status: -1, Message: 'Unknown error' };
  },

  // 9. Lấy danh sách Connectors
  getAllConnectors: async () => {
    const response = await apiClient.get<ApiResponse<any[]>>('/Connectors/GetAllConnectors');
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  // 10. Xóa Connector
  deleteConnector: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/Connectors/Delete/${id}`);
    return response.data || { Status: -1, Message: 'Delete failed' };
  }
};
