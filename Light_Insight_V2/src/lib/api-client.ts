import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Bạn có thể thêm interceptors ở đây để xử lý Token hoặc Catch lỗi tập trung
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log lỗi hệ thống hoặc chuyển hướng nếu 401 (Unauthorized)
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
