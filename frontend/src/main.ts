import { auth } from './utils/auth';
import { routes, getRoute, getParams, checkAuth } from './router';
import { renderLayout } from './components/Layout';
import * as pages from './pages';

type PageComponent = (params?: Record<string, string>) => Promise<HTMLElement>;

const pageComponents: Record<string, PageComponent> = {
  LoginPage: pages.LoginPage,
  HomePage: pages.HomePage,
  DeviceListPage: pages.DeviceListPage,
  DeviceDetailPage: pages.DeviceDetailPage,
  BorrowPage: pages.BorrowPage,
  ReturnPage: pages.ReturnPage,
  ReservationPage: pages.ReservationPage,
  MaintenancePage: pages.MaintenancePage,
  ExceptionPage: pages.ExceptionPage,
  ExceptionReviewPage: pages.ExceptionReviewPage,
  AdminDeviceTypePage: pages.AdminDeviceTypePage,
  AdminLocationPage: pages.AdminLocationPage,
  AdminDevicePage: pages.AdminDevicePage,
  AdminUserPage: pages.AdminUserPage,
};

function getCurrentPath(): string {
  const hash = window.location.hash.slice(1);
  return hash || '/';
}

function navigate(path: string) {
  window.location.hash = path;
}

async function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const path = getCurrentPath();
  const route = getRoute(path);

  if (!route) {
    app.innerHTML = '<div style="text-align: center; padding: 2rem;">页面不存在</div>';
    return;
  }

  if (!checkAuth(route)) {
    if (!auth.isAuthenticated()) {
      navigate('/login');
      return;
    }
    app.innerHTML = '<div style="text-align: center; padding: 2rem;">权限不足</div>';
    return;
  }

  const params = getParams(path, route.path);
  const pageComponent = pageComponents[route.component];

  if (!pageComponent) {
    app.innerHTML = '<div style="text-align: center; padding: 2rem;">页面组件不存在</div>';
    return;
  }

  try {
    app.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

    const content = await pageComponent(params);

    if (route.path === '/login') {
      app.innerHTML = '';
      app.appendChild(content);
    } else {
      const layout = renderLayout(content, path);
      app.innerHTML = '';
      app.appendChild(layout);

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          auth.clear();
          navigate('/login');
        });
      }

      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.innerHTML = '';
        mainContent.appendChild(content);
      }
    }
  } catch (error) {
    console.error('Page render error:', error);
    app.innerHTML = '<div style="text-align: center; padding: 2rem; color: #e53e3e;">页面加载失败，请刷新重试</div>';
  }
}

window.addEventListener('hashchange', render);

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) {
    if (auth.isAuthenticated()) {
      navigate('/');
    } else {
      navigate('/login');
    }
  } else {
    render();
  }
});
