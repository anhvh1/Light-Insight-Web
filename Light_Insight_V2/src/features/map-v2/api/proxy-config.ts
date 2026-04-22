/**
 * Cấu hình Proxy dành riêng cho module Map V2.
 * Giúp chuyển hướng các yêu cầu API và Map Styles sang Server Backend.
 */
export const mapV2ProxyRules = {
  '/api': {
    target: 'https://localhost:7276',
    changeOrigin: true,
    secure: false,
  },
  '/mapstyles': {
    target: 'https://localhost:7276',
    changeOrigin: true,
    secure: false,
  },
  '/maptiles': {
    target: 'https://localhost:7276',
    changeOrigin: true,
    secure: false,
  },
  '/hubs': {
    target: 'https://localhost:7276',
    ws: true,
    changeOrigin: true,
    secure: false,
  },
  '/health': {
    target: 'https://localhost:7276',
    changeOrigin: true,
    secure: false,
  },
  '/metrics': {
    target: 'https://localhost:7276',
    changeOrigin: true,
    secure: false,
  }
};
