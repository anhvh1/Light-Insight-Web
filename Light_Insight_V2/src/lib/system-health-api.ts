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
}

export const systemHealthApi = {
  getStatus: async () => {
    const response = await apiClient.get<ApiResponse<SystemHealthData>>('/SystemHealth/Status');
    return response.data;
  }
};
