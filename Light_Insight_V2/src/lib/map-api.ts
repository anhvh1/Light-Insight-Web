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
  },

  getCameras: async (id: number) => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/DMMap/GetCamerasAsync?id=${id}`);
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  saveMarkers: async (data: { 
    MapId: string; 
    Markers: { 
      CameraId: string; 
      CameraName: string; 
      PosX: number; 
      PosY: number; 
      Icon: string; 
      VmsId: number; 
      Rotation: number 
    }[] 
  }) => {
    const response = await apiClient.post<ApiResponse<null>>('/DMMap/SaveMarkers', data);
    return response.data || { Status: -1, Message: 'Save failed' };
  },

  getMarkers: async (mapId: string) => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/DMMap/GetMarkers/${mapId}`);
    return response.data || { Data: [], Status: 0, Message: '' };
  }
};
