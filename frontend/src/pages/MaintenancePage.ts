import { api } from '../api';
import { formatDateTime, getStatusBadgeClass } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { MaintenanceRecord, Device } from '../types';

export async function MaintenancePage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let records: MaintenanceRecord[] = [];
  let pendingDevices: Device[] = [];

  const loadData = async () => {
    try {
      [records, pendingDevices] = await Promise.all([
        api.maintenanceRecords.list(),
        api.devices.list({ status: 'pending_maintenance' }),
      ]);
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const showMaintenanceModal = () => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">选择设备</label>
        <select class="form-select" id="maintenance-device" required>
          <option value="">请选择待维护设备</option>
          ${pendingDevices.map(d => `<option value="${d.id}">${d.asset_number} - ${d.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">维护类型</label>
        <select class="form-select" id="maintenance-type" required>
          <option value="">请选择维护类型</option>
          <option value="日常维护">日常维护</option>
          <option value="故障维修">故障维修</option>
          <option value="硬件升级">硬件升级</option>
          <option value="软件更新">软件更新</option>
          <option value="清洁保养">清洁保养</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">维护说明</label>
        <textarea class="form-textarea" id="maintenance-desc" placeholder="请输入维护说明" required></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">维护结果</label>
        <textarea class="form-textarea" id="maintenance-result" placeholder="请输入维护结果" required></textarea>
      </div>
    `;

    showModal('登记维护', content, async () => {
      const deviceId = Number((content.querySelector('#maintenance-device') as HTMLSelectElement).value);
      const maintenanceType = (content.querySelector('#maintenance-type') as HTMLSelectElement).value;
      const description = (content.querySelector('#maintenance-desc') as HTMLTextAreaElement).value;
      const result = (content.querySelector('#maintenance-result') as HTMLTextAreaElement).value;

      if (!deviceId || !maintenanceType || !description || !result) {
        showAlert('请填写完整信息');
        return false;
      }

      try {
        await api.maintenanceRecords.create({
          device: deviceId,
          maintenance_type: maintenanceType,
          description,
          result,
        });
        showAlert('维护登记成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '登记失败');
        return false;
      }
    });
  };

  const render = () => {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">维护记录</h2>
        <button class="btn btn-primary" id="add-maintenance-btn">登记维护</button>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <h3 style="margin-bottom: 0.75rem;">待维护设备 (${pendingDevices.length})</h3>
        ${pendingDevices.length > 0 ? `
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${pendingDevices.map(d => `
              <span class="badge badge-pending-maintenance" style="padding: 0.5rem 0.75rem;">
                ${d.asset_number} - ${d.name}
              </span>
            `).join('')}
          </div>
        ` : '<p style="color: #718096;">暂无待维护设备</p>'}
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>资产编号</th>
            <th>设备名称</th>
            <th>操作人</th>
            <th>维护时间</th>
            <th>维护类型</th>
            <th>说明</th>
            <th>结果</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${records.length > 0 ? records.map(record => `
            <tr>
              <td>${record.asset_number}</td>
              <td>${record.device_name}</td>
              <td>${record.operator_name}</td>
              <td>${formatDateTime(record.maintenance_date)}</td>
              <td>${record.maintenance_type}</td>
              <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.description}</td>
              <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.result}</td>
              <td>
                ${record.completed ? '<span class="badge badge-available">已完成</span>' : '<span class="badge badge-pending-maintenance">进行中</span>'}
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="8" class="empty-state">暂无维护记录</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const addBtn = container.querySelector('#add-maintenance-btn');
    if (addBtn) {
      addBtn.addEventListener('click', showMaintenanceModal);
    }
  };

  await loadData();
  return container;
}
