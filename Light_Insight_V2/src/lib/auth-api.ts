import { apiClient } from './api-client';
import type { ApiResponse } from '@/types';

export interface LoginRequest {
  Username?: string;
  Password?: string;
}

export interface RegisterRequest {
  Username?: string;
  Password?: string;
  Name?: string;
  Email?: string;
  PhoneNumber?: string;
  Status?: string;
  RoleId?: string;
}

export interface UserInfo {
  Username: string;
  Name: string;
  Email: string;
  PhoneNumber: string;
  RoleName: string;
  Status: string;
  LastLogin?: string;
}

export const authApi = {
  login: async (data: LoginRequest) => {
    // Gọi đến API Đăng nhập
    const response = await apiClient.post<ApiResponse<any>>('/Login/Login', data);
    return response.data || { Status: 0, Message: 'Lỗi không xác định' };
  },

  register: async (data: RegisterRequest) => {
    // Gọi đến API Đăng ký
    const response = await apiClient.post<ApiResponse<null>>('/Register/Register', data);
    return response.data || { Status: 0, Message: 'Lỗi đăng ký' };
  },

  getUsers: async (search?: string, page: number = 1, pageSize: number = 10) => {
    // Lấy danh sách user (nếu cần cho quản trị)
    const response = await apiClient.get<ApiResponse<UserInfo[]>>('/Login/Users', {
      params: { search, page, pageSize }
    });
    return response.data || { Data: [], Status: 0, Message: '' };
  }
};
