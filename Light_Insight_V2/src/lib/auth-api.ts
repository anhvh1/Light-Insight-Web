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
    const response = await apiClient.post<ApiResponse<any>>('/Login/Login', data);
    return response.data || { Status: 0, Message: 'Lỗi không xác định' };
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post<ApiResponse<null>>('/Register/Register', data);
    return response.data || { Status: 0, Message: 'Lỗi đăng ký' };
  },

  getUsers: async (search?: string, page: number = 1, pageSize: number = 10) => {
    const response = await apiClient.get<ApiResponse<UserInfo[]>>('/Login/Users', {
      params: { search, page, pageSize }
    });
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  getRoles: async () => {
    const response = await apiClient.get<ApiResponse<any[]>>('/Login/Roles');
    return response.data || { Data: [], Status: 0, Message: '' };
  },

  getUserFromToken: () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      // Backend Claims: username, name, email, phone, roleId, roleName
      return {
        username: decoded.username,
        name: decoded.name,
        roleId: decoded.roleId,
        roleName: decoded.roleName
      };
    } catch (e) {
      return null;
    }
  },

  logout: async () => {
    try {
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        const user = JSON.parse(userInfoStr);
        if (user && user.username) {
          await apiClient.post(`Login/Logout?username=${user.username}`);
        }
      }
    } catch (e) {
      console.error('Logout logging failed', e);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      window.location.href = '/login';
    }
  }
};
