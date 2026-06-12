import { auth } from '../utils/auth';

export interface Route {
  path: string;
  component: string;
  requiresAuth?: boolean;
  roles?: string[];
}

export const routes: Route[] = [
  { path: '/login', component: 'LoginPage', requiresAuth: false },
  { path: '/', component: 'HomePage', requiresAuth: true },
  { path: '/devices', component: 'DeviceListPage', requiresAuth: true },
  { path: '/devices/:id', component: 'DeviceDetailPage', requiresAuth: true },
  { path: '/borrow', component: 'BorrowPage', requiresAuth: true, roles: ['employee', 'admin'] },
  { path: '/return', component: 'ReturnPage', requiresAuth: true, roles: ['employee', 'admin'] },
  { path: '/reservations', component: 'ReservationPage', requiresAuth: true, roles: ['employee', 'admin'] },
  { path: '/maintenance', component: 'MaintenancePage', requiresAuth: true, roles: ['employee', 'admin'] },
  { path: '/exceptions', component: 'ExceptionPage', requiresAuth: true },
  { path: '/exceptions/review', component: 'ExceptionReviewPage', requiresAuth: true, roles: ['supervisor', 'admin'] },
  { path: '/admin/types', component: 'AdminDeviceTypePage', requiresAuth: true, roles: ['admin'] },
  { path: '/admin/locations', component: 'AdminLocationPage', requiresAuth: true, roles: ['admin'] },
  { path: '/admin/devices', component: 'AdminDevicePage', requiresAuth: true, roles: ['admin'] },
  { path: '/admin/users', component: 'AdminUserPage', requiresAuth: true, roles: ['admin'] },
];

export function getRoute(path: string): Route | undefined {
  for (const route of routes) {
    const routeParts = route.path.split('/');
    const pathParts = path.split('/');

    if (routeParts.length !== pathParts.length) continue;

    let match = true;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) continue;
      if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) return route;
  }
  return undefined;
}

export function getParams(path: string, routePath: string): Record<string, string> {
  const params: Record<string, string> = {};
  const routeParts = routePath.split('/');
  const pathParts = path.split('/');

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = pathParts[i];
    }
  }

  return params;
}

export function checkAuth(route: Route): boolean {
  if (!route.requiresAuth) return true;
  if (!auth.isAuthenticated()) return false;
  if (route.roles && route.roles.length > 0) {
    return auth.hasRole(route.roles);
  }
  return true;
}
