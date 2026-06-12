import { auth } from '../utils/auth';
import { getRoleText, getRoleBadgeClass } from '../utils/format';

interface NavItem {
  path: string;
  label: string;
  roles?: string[];
}

export function renderLayout(content: HTMLElement, currentPath: string): HTMLElement {
  const app = document.createElement('div');

  const user = auth.getUser();

  const navItems: NavItem[] = [
    { path: '/', label: '首页' },
    { path: '/devices', label: '设备列表' },
    { path: '/borrow', label: '借用设备', roles: ['employee', 'admin'] },
    { path: '/return', label: '归还设备', roles: ['employee', 'admin'] },
    { path: '/maintenance', label: '维护记录', roles: ['employee', 'admin'] },
    { path: '/exceptions', label: '异常记录' },
    { path: '/exceptions/review', label: '异常复核', roles: ['supervisor', 'admin'] },
    { path: '/admin/types', label: '设备类型', roles: ['admin'] },
    { path: '/admin/locations', label: '存放位置', roles: ['admin'] },
    { path: '/admin/devices', label: '设备管理', roles: ['admin'] },
    { path: '/admin/users', label: '用户管理', roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  app.innerHTML = `
    <header class="header">
      <div class="header-content">
        <h1>IT设备管理系统</h1>
        <nav class="nav">
          ${filteredNav.map(item => `
            <a href="#${item.path}" class="${currentPath === item.path ? 'active' : ''}">${item.label}</a>
          `).join('')}
        </nav>
        <div class="user-info">
          <span class="${user ? getRoleBadgeClass(user.role) : ''}">${user ? getRoleText(user.role) : ''}</span>
          <span>${user ? user.real_name : ''}</span>
          <button class="btn btn-sm btn-secondary" id="logout-btn">退出</button>
        </div>
      </div>
    </header>
    <main class="container" id="main-content"></main>
  `;

  const mainContent = app.querySelector('#main-content');
  if (mainContent) {
    mainContent.appendChild(content);
  }

  setTimeout(() => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        auth.clear();
        window.location.hash = '#/login';
      };
    }
  }, 0);

  return app;
}
