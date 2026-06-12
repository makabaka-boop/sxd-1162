import { api } from '../api';
import { formatDate } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { Location } from '../types';

export async function AdminLocationPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let locations: Location[] = [];

  const loadData = async () => {
    try {
      locations = await api.locations.list();
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const showAddModal = () => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">位置名称</label>
        <input type="text" class="form-input" id="loc-name" placeholder="请输入位置名称" required>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea class="form-textarea" id="loc-desc" placeholder="请输入描述（可选）"></textarea>
      </div>
    `;

    showModal('添加存放位置', content, async () => {
      const name = (content.querySelector('#loc-name') as HTMLInputElement).value;
      const description = (content.querySelector('#loc-desc') as HTMLTextAreaElement).value;

      if (!name) {
        showAlert('请输入位置名称');
        return false;
      }

      try {
        await api.locations.create({ name, description });
        showAlert('添加成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '添加失败');
        return false;
      }
    });
  };

  const showEditModal = (item: Location) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">位置名称</label>
        <input type="text" class="form-input" id="loc-name" value="${item.name}" required>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea class="form-textarea" id="loc-desc">${item.description}</textarea>
      </div>
    `;

    showModal('编辑存放位置', content, async () => {
      const name = (content.querySelector('#loc-name') as HTMLInputElement).value;
      const description = (content.querySelector('#loc-desc') as HTMLTextAreaElement).value;

      if (!name) {
        showAlert('请输入位置名称');
        return false;
      }

      try {
        await api.locations.update(item.id, { name, description });
        showAlert('更新成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '更新失败');
        return false;
      }
    });
  };

  const deleteItem = async (item: Location) => {
    if (!confirm(`确定要删除存放位置"${item.name}"吗？`)) return;
    try {
      await api.locations.delete(item.id);
      showAlert('删除成功', 'success');
      loadData();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const render = () => {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">存放位置管理</h2>
        <button class="btn btn-primary" id="add-btn">添加位置</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>描述</th>
            <th>设备数量</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${locations.length > 0 ? locations.map(item => `
            <tr>
              <td>${item.id}</td>
              <td>${item.name}</td>
              <td style="max-width: 300px;">${item.description || '-'}</td>
              <td>${item.device_count}</td>
              <td>${formatDate(item.created_at)}</td>
              <td>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${item.id}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}">删除</button>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="6" class="empty-state">暂无数据</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const addBtn = container.querySelector('#add-btn');
    if (addBtn) addBtn.addEventListener('click', showAddModal);

    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const item = locations.find(l => l.id === id);
        if (item) showEditModal(item);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const item = locations.find(l => l.id === id);
        if (item) deleteItem(item);
      });
    });
  };

  await loadData();
  return container;
}
