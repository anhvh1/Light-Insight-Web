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
import { HiddenPlaybackPage } from './features/video/HiddenPlaybackPage';
import { IncidentManagement } from './features/incidents/IncidentManagement';
import { ConfigurationLayout } from './features/config/ConfigurationLayout';
import { UsersRolesSection } from './features/config/sections/UsersRolesSection';
import { AlarmPrioritySection } from './features/config/sections/AlarmPrioritySection';
import { ConnectorsSection } from './features/config/sections/ConnectorsSection';
import { RuleAlarmConfigSection } from './features/config/sections/RuleAlarmConfigSection';
import { LoginPage } from './features/auth/LoginPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { ShiftHandoverPage } from './features/shift/ShiftHandoverPage';
import { SystemHealthPage } from './features/health/SystemHealthPage';
import { SopBuilderSection } from './features/config/sections/SopBuilder';
import { EscalationRulesSection } from './features/config/sections/EscalationRulesSection';
import { NotificationsSection } from './features/config/sections/NotificationsSection';
import MapV2Page from './features/config/sections/mapManagementSection/MapV2Page';

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

const hiddenPlaybackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/embed/playback',
  component: HiddenPlaybackPage,
});

// 3. Authenticated Layout Route
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

// 4. Các trang con
const indexRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/', component: AlarmConsole });
const alarmRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/alarm', component: AlarmConsole });
const mapViewRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/map', component: MapView });
const mapV2Route = createRoute({ getParentRoute: () => authLayoutRoute, path: '/map-v2', component: MapV2Page });
const videoWallRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/wall', component: VideoWall });
const incidentRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/incident', component: IncidentManagement });
const analyticsRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/analytics', component: AnalyticsPage });
const shiftRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/shift', component: ShiftHandoverPage });
const healthRoute = createRoute({ getParentRoute: () => authLayoutRoute, path: '/health', component: SystemHealthPage });

// Config Layout Route
const configRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/config',
  component: ConfigurationLayout,
});

// Nested routes for Configuration
const configUsersRolesRoute = createRoute({
  getParentRoute: () => configRoute,
  path: 'users-roles',
  component: () => <UsersRolesSection getUserGradient={(name: string) => {
    const chars = (name || 'US').split(' ').map((n: any) => n[0]).join('');
    const sum = chars.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const grads = ['from-psim-accent2 to-blue-600', 'from-psim-orange to-psim-red', 'from-psim-red to-purple-600', 'from-psim-green to-teal-600', 'from-purple-500 to-indigo-600'];
    return grads[sum % grads.length];
  }} />
});

const configPriorityRoute = createRoute({
  getParentRoute: () => configRoute,
  path: 'priority',
  component: () => <AlarmPrioritySection actualConnectors={[]} />
});

const configMapRoute = createRoute({
  getParentRoute: () => configRoute,
  path: 'map',
  component: MapV2Page
});

const configConnectorsRoute = createRoute({
  getParentRoute: () => configRoute,
  path: 'connectors',
  component: ConnectorsSection
});

const configRulesRoute = createRoute({
  getParentRoute: () => configRoute,
  path: 'rules',
  component: RuleAlarmConfigSection
});

const configSopBuilderRoute = createRoute({
  getParentRoute: () => configRoute,
  path: 'sop',
  component: SopBuilderSection
});

const configEscalationRulesSection = createRoute({
  getParentRoute: () => configRoute,
  path: 'escalation',
  component: EscalationRulesSection
});

const configNotificationsSection = createRoute({
  getParentRoute: () => configRoute,
  path: 'notif',
  component: NotificationsSection
});

// Root Page Redirect
const configIndexRoute = createRoute({
  getParentRoute: () => configRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/config/users-roles' }); }
});

// 5. Tạo cây Route
const routeTree = rootRoute.addChildren([
  loginRoute,
  hiddenPlaybackRoute,
  authLayoutRoute.addChildren([
    indexRoute,
    alarmRoute,
    mapViewRoute,
    mapV2Route,
    videoWallRoute,
    incidentRoute,
    analyticsRoute,
    shiftRoute,
    healthRoute,
    configRoute.addChildren([
      configIndexRoute,
      configUsersRolesRoute,
      configPriorityRoute,
      configMapRoute,
      configConnectorsRoute,
      configRulesRoute,
      configSopBuilderRoute,
      configEscalationRulesSection,
      configNotificationsSection
    ]),
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
