import { api } from '../api';
import { formatDate } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { DeviceType } from '../types';

export async function AdminDeviceTypePage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let types: DeviceType[] = [];

  const loadData = async () => {
    try {
      types = await api.deviceTypes.list();
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const showAddModal = () => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">类型名称</label>
        <input type="text" class="form-input" id="type-name" placeholder="请输入类型名称" required>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea class="form-textarea" id="type-desc" placeholder="请输入描述（可选）"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">库存预警阈值</label>
        <input type="number" class="form-input" id="type-threshold" value="5" min="1">
      </div>
    `;

    showModal('添加设备类型', content, async () => {
      const name = (content.querySelector('#type-name') as HTMLInputElement).value;
      const description = (content.querySelector('#type-desc') as HTMLTextAreaElement).value;
      const warningThreshold = Number((content.querySelector('#type-threshold') as HTMLInputElement).value);

      if (!name) {
        showAlert('请输入类型名称');
        return;
      }

      try {
        await api.deviceTypes.create({ name, description, warning_threshold: warningThreshold });
        showAlert('添加成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '添加失败');
      }
    });
  };

  const showEditModal = (item: DeviceType) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">类型名称</label>
        <input type="text" class="form-input" id="type-name" value="${item.name}" required>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea class="form-textarea" id="type-desc">${item.description}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">库存预警阈值</label>
        <input type="number" class="form-input" id="type-threshold" value="${item.warning_threshold}" min="1">
      </div>
    `;

    showModal('编辑设备类型', content, async () => {
      const name = (content.querySelector('#type-name') as HTMLInputElement).value;
      const description = (content.querySelector('#type-desc') as HTMLTextAreaElement).value;
      const warningThreshold = Number((content.querySelector('#type-threshold') as HTMLInputElement).value);

      if (!name) {
        showAlert('请输入类型名称');
        return;
      }

      try {
        await api.deviceTypes.update(item.id, { name, description, warning_threshold: warningThreshold });
        showAlert('更新成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '更新失败');
      }
    });
  };

  const deleteItem = async (item: DeviceType) => {
    if (!confirm(`确定要删除设备类型"${item.name}"吗？`)) return;
    try {
      await api.deviceTypes.delete(item.id);
      showAlert('删除成功', 'success');
      loadData();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const render = () => {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">设备类型管理</h2>
        <button class="btn btn-primary" id="add-btn">添加类型</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>描述</th>
            <th>可用数量</th>
            <th>总数量</th>
            <th>预警阈值</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${types.length > 0 ? types.map(item => `
            <tr>
              <td>${item.id}</td>
              <td>${item.name}</td>
              <td style="max-width: 200px;">${item.description || '-'}</td>
              <td>${item.available_count}</td>
              <td>${item.total_count}</td>
              <td>
                <span class="badge ${item.available_count < item.warning_threshold ? 'badge-exception-pending' : 'badge-available'}">
                  ${item.warning_threshold}
                </span>
              </td>
              <td>${formatDate(item.created_at)}</td>
              <td>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${item.id}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}">删除</button>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="8" class="empty-state">暂无数据</td></tr>
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
        const item = types.find(t => t.id === id);
        if (item) showEditModal(item);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const item = types.find(t => t.id === id);
        if (item) deleteItem(item);
      });
    });
  };

  await loadData();
  return container;
}
