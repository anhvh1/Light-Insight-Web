/**
 * Cấu hình Proxy dành riêng cho module Map V2.
 * Giúp chuyển hướng các yêu cầu API và Map Styles sang Server Backend.
 */
export const mapV2ProxyRules = {
  '/api': {
    target: 'http://localhost:5177',
    changeOrigin: true,
    secure: false,
  },
  '/mapstyles': {
    target: 'http://localhost:5177',
    changeOrigin: true,
    secure: false,
  },
  '/maptiles': {
    target: 'http://localhost:5177',
    changeOrigin: true,
    secure: false,
  },
  '/hubs': {
    target: 'http://localhost:5177',
    ws: true,
    changeOrigin: true,
    secure: false,
  },
  '/health': {
    target: 'http://localhost:5177',
    changeOrigin: true,
  },
  '/metrics': {
    target: 'http://localhost:5177',
    changeOrigin: true,
  }
};
