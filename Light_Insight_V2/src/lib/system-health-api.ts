import { apiClient } from './api-client';
import type { ApiResponse } from '@/types';

export interface SystemHealthData {
  Connectors: ConnectorHealth[];
  Infrastructure: InfrastructureHealth[];
}

export interface ConnectorHealth {
  Name: string;
  ApiInfo: string;
  Latency: string;
  Stats: string;
  StatsLabel: string;
  EventsPerMin: string;
  Status: string;
  HealthPercentage: number;
}

export interface InfrastructureHealth {
  Name: string;
  Description: string;
  Status: string;
  Type: string;
  ConnectorId: string;
}

export interface AuditLog {
  Id: string;
  CreatedAt: string;
  Username: string;
  UserRole: string;
  IpAddress: string;
  ActionType: string;
  Description: string;
  Metadata: string;
}

export const systemHealthApi = {
  getStatus: async () => {
    const response = await apiClient.get<ApiResponse<SystemHealthData>>('SystemHealth/Status');
    return response.data;
  },

  getAuditLogs: async (page: number = 1, pageSize: number = 50, search?: string) => {
    const response = await apiClient.get<ApiResponse<AuditLog[]>>('AuditLog/GetAll', {
      params: { page, pageSize, search }
    });
    return response.data || { Data: [], TotalRow: 0, Status: 0, Message: '' };
  }
};
