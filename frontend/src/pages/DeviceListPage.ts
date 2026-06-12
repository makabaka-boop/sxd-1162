import { api } from '../api';
import { formatDate, getStatusBadgeClass } from '../utils/format';
import { showAlert } from '../components/Modal';
import type { Device, DeviceFilters, DeviceType, Location, User } from '../types';

export async function DeviceListPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let devices: Device[] = [];
  let deviceTypes: DeviceType[] = [];
  let locations: Location[] = [];
  let users: User[] = [];
  let filters: DeviceFilters = {};

  const loadData = async () => {
    try {
      [devices, deviceTypes, locations, users] = await Promise.all([
        api.devices.list(filters),
        api.deviceTypes.list(),
        api.locations.list(),
        api.users.list().catch(() => []),
      ]);
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const render = () => {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">设备列表</h2>
      </div>

      <div class="filters">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">设备类型</label>
          <select class="form-select" id="filter-type">
            <option value="">全部</option>
            ${deviceTypes.map(t => `<option value="${t.id}" ${filters.device_type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">存放位置</label>
          <select class="form-select" id="filter-location">
            <option value="">全部</option>
            ${locations.map(l => `<option value="${l.id}" ${filters.location === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">设备状态</label>
          <select class="form-select" id="filter-status">
            <option value="">全部</option>
            <option value="available" ${filters.status === 'available' ? 'selected' : ''}>可借用</option>
            <option value="borrowed" ${filters.status === 'borrowed' ? 'selected' : ''}>已借用</option>
            <option value="pending_maintenance" ${filters.status === 'pending_maintenance' ? 'selected' : ''}>待维护</option>
            <option value="exception_pending" ${filters.status === 'exception_pending' ? 'selected' : ''}>异常待核</option>
            <option value="maintaining" ${filters.status === 'maintaining' ? 'selected' : ''}>维护中</option>
            <option value="recovered" ${filters.status === 'recovered' ? 'selected' : ''}>恢复可用</option>
            <option value="decommissioned" ${filters.status === 'decommissioned' ? 'selected' : ''}>停用</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">借用人</label>
          <select class="form-select" id="filter-borrower">
            <option value="">全部</option>
            ${users.map(u => `<option value="${u.id}" ${filters.borrower === u.id ? 'selected' : ''}>${u.real_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">开始日期</label>
          <input type="date" class="form-input" id="filter-start" value="${filters.start_date || ''}">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">结束日期</label>
          <input type="date" class="form-input" id="filter-end" value="${filters.end_date || ''}">
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>资产编号</th>
            <th>设备名称</th>
            <th>类型</th>
            <th>位置</th>
            <th>状态</th>
            <th>借用人</th>
            <th>周转次数</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${devices.length > 0 ? devices.map(device => `
            <tr>
              <td>${device.asset_number}</td>
              <td>${device.name}</td>
              <td>${device.device_type_name}</td>
              <td>${device.location_name}</td>
              <td>
                <span class="${getStatusBadgeClass(device.status)}">${device.status_display}</span>
                ${device.is_overdue ? '<span class="badge badge-overdue" style="margin-left: 0.25rem;">逾期</span>' : ''}
              </td>
              <td>${device.current_borrower ? device.current_borrower.real_name : '-'}</td>
              <td>${device.turnover_count}</td>
              <td>${formatDate(device.created_at)}</td>
              <td>
                <a href="#/devices/${device.id}" class="btn btn-sm btn-primary">详情</a>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="9" class="empty-state">暂无设备数据</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const typeSelect = container.querySelector('#filter-type') as HTMLSelectElement;
    const locationSelect = container.querySelector('#filter-location') as HTMLSelectElement;
    const statusSelect = container.querySelector('#filter-status') as HTMLSelectElement;
    const borrowerSelect = container.querySelector('#filter-borrower') as HTMLSelectElement;
    const startInput = container.querySelector('#filter-start') as HTMLInputElement;
    const endInput = container.querySelector('#filter-end') as HTMLInputElement;

    const onChange = () => {
      filters = {
        device_type: typeSelect.value ? Number(typeSelect.value) : undefined,
        location: locationSelect.value ? Number(locationSelect.value) : undefined,
        status: statusSelect.value as any || undefined,
        borrower: borrowerSelect.value ? Number(borrowerSelect.value) : undefined,
        start_date: startInput.value || undefined,
        end_date: endInput.value || undefined,
      };
      loadData();
    };

    typeSelect.onchange = onChange;
    locationSelect.onchange = onChange;
    statusSelect.onchange = onChange;
    borrowerSelect.onchange = onChange;
    startInput.onchange = onChange;
    endInput.onchange = onChange;
  };

  await loadData();
  return container;
}
