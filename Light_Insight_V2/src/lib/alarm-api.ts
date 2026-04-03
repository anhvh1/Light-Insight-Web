import { apiClient } from './api-client';

export interface AlarmApiItem {
  alarmId?: string;
  alarmName?: string;
  location?: string;
  message?: string;
  priorityLevel?: number;
  priorityName?: string;
  source?: string;
  stateLevel?: number;
  stateName?: string;
  time?: string;
  type?: string;
}

export const alarmApi = {
  getAll: async () => {
    const response = await apiClient.get<AlarmApiItem[] | { Data?: AlarmApiItem[] }>('/Alarm/GetAll');
    const payload = response.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    return payload?.Data ?? [];
  },
};
