import { api } from '../api';
import { auth } from '../utils/auth';
import { showAlert } from '../components/Modal';

export async function LoginPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'login-container';

  container.innerHTML = `
    <div class="login-card">
      <h2>IT设备管理系统</h2>
      <p class="subtitle">请登录以继续</p>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input type="text" class="form-input" id="username" placeholder="请输入用户名" required>
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input type="password" class="form-input" id="password" placeholder="请输入密码" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">登录</button>
      </form>
      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 0.75rem; color: #718096; text-align: center;">测试账号：</p>
        <p style="font-size: 0.75rem; color: #718096; text-align: center;">管理员：admin / admin123</p>
        <p style="font-size: 0.75rem; color: #718096; text-align: center;">员工：employee / employee123</p>
        <p style="font-size: 0.75rem; color: #718096; text-align: center;">主管：supervisor / supervisor123</p>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form') as HTMLFormElement;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const username = (container.querySelector('#username') as HTMLInputElement).value;
    const password = (container.querySelector('#password') as HTMLInputElement).value;

    try {
      const response = await api.auth.login(username, password);
      auth.setToken(response.access, response.refresh);
      auth.setUser(response.user);
      showAlert('登录成功', 'success');
      setTimeout(() => {
        window.location.hash = '#/';
      }, 500);
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '登录失败');
    }
  };

  return container;
}
