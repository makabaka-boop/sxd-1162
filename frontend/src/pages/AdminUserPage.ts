import { api } from '../api';
import { getRoleBadgeClass, getRoleText } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { User } from '../types';

export async function AdminUserPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let users: User[] = [];

  const loadData = async () => {
    try {
      users = await api.users.list();
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const showAddModal = () => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input type="text" class="form-input" id="user-username" placeholder="请输入用户名" required>
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input type="password" class="form-input" id="user-password" placeholder="请输入密码" required>
      </div>
      <div class="form-group">
        <label class="form-label">真实姓名</label>
        <input type="text" class="form-input" id="user-realname" placeholder="请输入真实姓名" required>
      </div>
      <div class="form-group">
        <label class="form-label">角色</label>
        <select class="form-select" id="user-role" required>
          <option value="employee">员工</option>
          <option value="supervisor">主管</option>
          <option value="admin">管理员</option>
        </select>
      </div>
    `;

    showModal('添加用户', content, async () => {
      const username = (content.querySelector('#user-username') as HTMLInputElement).value;
      const password = (content.querySelector('#user-password') as HTMLInputElement).value;
      const realName = (content.querySelector('#user-realname') as HTMLInputElement).value;
      const role = (content.querySelector('#user-role') as HTMLSelectElement).value;

      if (!username || !password || !realName) {
        showAlert('请填写完整信息');
        return;
      }

      try {
        await api.users.create({ username, password, real_name: realName, role });
        showAlert('添加成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '添加失败');
      }
    });
  };

  const deleteItem = async (item: User) => {
    if (!confirm(`确定要删除用户"${item.real_name}"吗？`)) return;
    try {
      await api.users.delete(item.id);
      showAlert('删除成功', 'success');
      loadData();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const render = () => {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">用户管理</h2>
        <button class="btn btn-primary" id="add-btn">添加用户</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>真实姓名</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${users.length > 0 ? users.map(item => `
            <tr>
              <td>${item.id}</td>
              <td>${item.username}</td>
              <td>${item.real_name}</td>
              <td><span class="${getRoleBadgeClass(item.role)}">${getRoleText(item.role)}</span></td>
              <td>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}">删除</button>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="5" class="empty-state">暂无数据</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const addBtn = container.querySelector('#add-btn');
    if (addBtn) addBtn.addEventListener('click', showAddModal);

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const item = users.find(u => u.id === id);
        if (item) deleteItem(item);
      });
    });
  };

  await loadData();
  return container;
}
