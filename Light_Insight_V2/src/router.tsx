import { 
  createRouter, 
  createRootRoute, 
  createRoute
} from '@tanstack/react-router';
import { MainLayout } from './components/layout/MainLayout';
import { AlarmConsole } from './features/alarms/AlarmConsole';

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

// 3. Định nghĩa Alarm Route
const alarmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/alarm',
  component: AlarmConsole,
});

// 4. Tạo cây Route
const routeTree = rootRoute.addChildren([
  indexRoute,
  alarmRoute,
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