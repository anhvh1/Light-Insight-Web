import { apiClient } from './api-client';
import type { ApiResponse, MapTreeNode } from '@/types';

export const mapApi = {
  getAllTree: async () => {
    const response = await apiClient.get<ApiResponse<MapTreeNode[]>>('/DMMap/GetAllTree');
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  createMap: async (data: { Name: string; Code: string; ParentId: string | null }) => {
    const response = await apiClient.post<ApiResponse<null>>('/DMMap/Add', data);
    return response.data || { Status: -1, Message: 'Unknown error' };
  },

  updateMap: async (data: { Id: string; Name: string; Code: string; ParentId: string | null }) => {
    const response = await apiClient.put<ApiResponse<null>>('/DMMap/Update', data);
    return response.data || { Status: -1, Message: 'Unknown error' };
  },

  deleteMap: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/DMMap/Delete/${id}`);
    return response.data || { Status: -1, Message: 'Delete failed' };
  }
};
