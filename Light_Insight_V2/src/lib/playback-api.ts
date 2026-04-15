import { apiClient } from './api-client';

export interface WebRtcTokenResponse {
  baseUrl: string;
  bearerToken: string;
}

export async function getWebRtcTokenByConnectorKey(key: string): Promise<WebRtcTokenResponse> {
  const response = await apiClient.get('/Token/WebRTC', {
    params: { key },
  });
  const data = response.data as Partial<WebRtcTokenResponse> | undefined;
  return {
    baseUrl: typeof data?.baseUrl === 'string' ? data.baseUrl : '',
    bearerToken: typeof data?.bearerToken === 'string' ? data.bearerToken : '',
  };
}

