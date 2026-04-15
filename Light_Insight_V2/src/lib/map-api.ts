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

  deleteImage: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/DMMap/DeleteImage/${id}`);
    return response.data || { Status: -1, Message: 'Delete failed' };
  },

  getAllDevices: async (key: string) => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/DMMap/GetAllDevicesAsync?key=${key}`);
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
      Connectorid?: string;
      Type?: number;
      Rotation: number;
      IP?: string;
    }[] 
  }) => {
    const response = await apiClient.post<ApiResponse<null>>('/DMMap/SaveMarkers', data);
    return response.data || { Status: -1, Message: 'Save failed' };
  },

  getMarkers: async (mapId: string) => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/DMMap/GetMarkers/${mapId}`);
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  uploadImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<string>>(`/DMMap/UploadImage/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data || { Status: -1, Message: 'Upload failed' };
  },

  getSampleImageUrl: async () => {
    const response = await apiClient.get<ApiResponse<string>>('/SystemConfig/GetSampleImageUrl');
    return response.data || { Data: '', Status: 0, Message: '' };
  },

  downloadSampleImage: async () => {
    return apiClient.get('/SystemConfig/DownloadSampleImage', {
      responseType: 'blob'
    });
  },

  getMilestoneAlarms: async (mapId: string, page = 0, size = 10) => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/milestone/GetAlarms?MapId=${mapId}&Page=${page}&Size=${size}`);
    return response.data || { Data: [], Status: 0, Message: '' };
  }
};
