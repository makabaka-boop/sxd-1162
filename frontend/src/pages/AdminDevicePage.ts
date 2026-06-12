import { api } from '../api';
import { formatDate, getStatusBadgeClass } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { Device, DeviceType, Location } from '../types';

export async function AdminDevicePage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let devices: Device[] = [];
  let deviceTypes: DeviceType[] = [];
  let locations: Location[] = [];

  const loadData = async () => {
    try {
      [devices, deviceTypes, locations] = await Promise.all([
        api.devices.list(),
        api.deviceTypes.list(),
        api.locations.list(),
      ]);
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const showAddModal = () => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">资产编号</label>
        <input type="text" class="form-input" id="device-asset" placeholder="例如：IT-0001" required>
      </div>
      <div class="form-group">
        <label class="form-label">设备名称</label>
        <input type="text" class="form-input" id="device-name" placeholder="请输入设备名称" required>
      </div>
      <div class="form-group">
        <label class="form-label">设备类型</label>
        <select class="form-select" id="device-type" required>
          <option value="">请选择</option>
          ${deviceTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">存放位置</label>
        <select class="form-select" id="device-location" required>
          <option value="">请选择</option>
          ${locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">规格参数</label>
        <textarea class="form-textarea" id="device-spec" placeholder="请输入规格参数（可选）"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">采购日期</label>
        <input type="date" class="form-input" id="device-purchase">
      </div>
    `;

    showModal('添加设备', content, async () => {
      const assetNumber = (content.querySelector('#device-asset') as HTMLInputElement).value;
      const name = (content.querySelector('#device-name') as HTMLInputElement).value;
      const deviceType = Number((content.querySelector('#device-type') as HTMLSelectElement).value);
      const location = Number((content.querySelector('#device-location') as HTMLSelectElement).value);
      const specification = (content.querySelector('#device-spec') as HTMLTextAreaElement).value;
      const purchaseDate = (content.querySelector('#device-purchase') as HTMLInputElement).value;

      if (!assetNumber || !name || !deviceType || !location) {
        showAlert('请填写完整信息');
        return false;
      }

      try {
        await api.devices.create({
          asset_number: assetNumber,
          name,
          device_type: deviceType,
          location,
          specification,
          purchase_date: purchaseDate || null,
        });
        showAlert('添加成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '添加失败');
        return false;
      }
    });
  };

  const showEditModal = (item: Device) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">资产编号</label>
        <input type="text" class="form-input" id="device-asset" value="${item.asset_number}" required>
      </div>
      <div class="form-group">
        <label class="form-label">设备名称</label>
        <input type="text" class="form-input" id="device-name" value="${item.name}" required>
      </div>
      <div class="form-group">
        <label class="form-label">设备类型</label>
        <select class="form-select" id="device-type" required>
          <option value="">请选择</option>
          ${deviceTypes.map(t => `<option value="${t.id}" ${item.device_type_id === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">存放位置</label>
        <select class="form-select" id="device-location" required>
          <option value="">请选择</option>
          ${locations.map(l => `<option value="${l.id}" ${item.location_id === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">设备状态</label>
        <select class="form-select" id="device-status" required>
          <option value="available" ${item.status === 'available' ? 'selected' : ''}>可借用</option>
          <option value="borrowed" ${item.status === 'borrowed' ? 'selected' : ''}>已借用</option>
          <option value="pending_maintenance" ${item.status === 'pending_maintenance' ? 'selected' : ''}>待维护</option>
          <option value="exception_pending" ${item.status === 'exception_pending' ? 'selected' : ''}>异常待核</option>
          <option value="maintaining" ${item.status === 'maintaining' ? 'selected' : ''}>维护中</option>
          <option value="recovered" ${item.status === 'recovered' ? 'selected' : ''}>恢复可用</option>
          <option value="decommissioned" ${item.status === 'decommissioned' ? 'selected' : ''}>停用</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">规格参数</label>
        <textarea class="form-textarea" id="device-spec">${item.specification || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">采购日期</label>
        <input type="date" class="form-input" id="device-purchase" value="${item.purchase_date ? item.purchase_date.substring(0, 10) : ''}">
      </div>
    `;

    showModal('编辑设备', content, async () => {
      const assetNumber = (content.querySelector('#device-asset') as HTMLInputElement).value;
      const name = (content.querySelector('#device-name') as HTMLInputElement).value;
      const deviceType = Number((content.querySelector('#device-type') as HTMLSelectElement).value);
      const location = Number((content.querySelector('#device-location') as HTMLSelectElement).value);
      const status = (content.querySelector('#device-status') as HTMLSelectElement).value;
      const specification = (content.querySelector('#device-spec') as HTMLTextAreaElement).value;
      const purchaseDate = (content.querySelector('#device-purchase') as HTMLInputElement).value;

      if (!assetNumber || !name || !deviceType || !location) {
        showAlert('请填写完整信息');
        return false;
      }

      try {
        await api.devices.update(item.id, {
          asset_number: assetNumber,
          name,
          device_type: deviceType,
          location,
          status: status as any,
          specification,
          purchase_date: purchaseDate || null,
        });
        showAlert('更新成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '更新失败');
        return false;
      }
    });
  };

  const deleteItem = async (item: Device) => {
    if (!confirm(`确定要删除设备"${item.name}"吗？`)) return;
    try {
      await api.devices.delete(item.id);
      showAlert('删除成功', 'success');
      loadData();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const render = () => {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">设备管理</h2>
        <button class="btn btn-primary" id="add-btn">添加设备</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>资产编号</th>
            <th>设备名称</th>
            <th>类型</th>
            <th>位置</th>
            <th>状态</th>
            <th>周转次数</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${devices.length > 0 ? devices.map(item => `
            <tr>
              <td>${item.asset_number}</td>
              <td>${item.name}</td>
              <td>${item.device_type_name}</td>
              <td>${item.location_name}</td>
              <td>
                <span class="${getStatusBadgeClass(item.status)}">${item.status_display}</span>
                ${item.is_overdue ? '<span class="badge badge-overdue" style="margin-left: 0.25rem;">逾期</span>' : ''}
              </td>
              <td>${item.turnover_count}</td>
              <td>${formatDate(item.created_at)}</td>
              <td>
                <a href="#/devices/${item.id}" class="btn btn-sm btn-primary">详情</a>
                <button class="btn btn-sm btn-secondary edit-btn" data-id="${item.id}">编辑</button>
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
        const item = devices.find(d => d.id === id);
        if (item) showEditModal(item);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const item = devices.find(d => d.id === id);
        if (item) deleteItem(item);
      });
    });
  };

  await loadData();
  return container;
}
