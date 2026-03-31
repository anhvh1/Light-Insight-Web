import { 
  createRouter, 
  createRootRoute, 
  createRoute
} from '@tanstack/react-router';
import { MainLayout } from './components/layout/MainLayout';
import { AlarmConsole } from './features/alarms/AlarmConsole';
import { MapView } from './features/map/MapView';
import { VideoWall } from './features/video/VideoWall';
import { IncidentManagement } from './features/incidents/IncidentManagement';
import { Configuration } from './features/config/Configuration';

// 1. Định nghĩa Root Route
const rootRoute = createRootRoute({
  component: () => (
    <MainLayout/>
  ),
});

// 2. Định nghĩa Index Route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: AlarmConsole, // Mặc định hiển thị Alarm Console
});

// 3. Định nghĩa các Route
const alarmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/alarm',
  component: AlarmConsole,
});

const mapViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map',
  component: MapView,
});

const videoWallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wall',
  component: VideoWall,
});

const incidentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/incident',
  component: IncidentManagement,
});

const configRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/config',
  component: Configuration,
});

// 4. Tạo cây Route
const routeTree = rootRoute.addChildren([
  indexRoute,
  alarmRoute,
  mapViewRoute,
  videoWallRoute,
  incidentRoute,
  configRoute,
]);

// 5. Khởi tạo Router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register router cho Type Safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}