import { 
  createRouter, 
  createRootRoute, 
  createRoute,
  Outlet,
  redirect
} from '@tanstack/react-router';
import { MainLayout } from './components/layout/MainLayout';
import { AlarmConsole } from './features/alarms/AlarmConsole';
import { MapView } from './features/map/MapView';
import { VideoWall } from './features/video/VideoWall';
import { IncidentManagement } from './features/incidents/IncidentManagement';
import { Configuration_V3 } from './features/config/Configuration_V3';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';

// 1. Root Route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// 2. Auth Routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      throw redirect({ to: '/' });
    }
  }
});

// const registerRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/register',
//   component: RegisterPage,
// });

// 3. Authenticated Layout Route - Bọc các trang chính bằng MainLayout
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: () => <MainLayout />,
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw redirect({ to: '/login' });
    }
  }
});

// 4. Các trang con nằm trong MainLayout
const indexRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/',
  component: AlarmConsole,
});

const alarmRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/alarm',
  component: AlarmConsole,
});

const mapViewRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/map',
  component: MapView,
});

const videoWallRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/wall',
  component: VideoWall,
});

const incidentRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/incident',
  component: IncidentManagement,
});

const configRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/config',
  component: Configuration_V3,
});

// 5. Tạo cây Route
const routeTree = rootRoute.addChildren([
  loginRoute,
  // registerRoute,
  authLayoutRoute.addChildren([
    indexRoute,
    alarmRoute,
    mapViewRoute,
    videoWallRoute,
    incidentRoute,
    configRoute,
  ]),
]);

// 6. Khởi tạo Router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}