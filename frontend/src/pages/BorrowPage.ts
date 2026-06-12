import { api } from '../api';
import { formatDate, getStatusBadgeClass } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { Device, DeviceType, Location } from '../types';

export async function BorrowPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let availableDevices: Device[] = [];
  let deviceTypes: DeviceType[] = [];
  let locations: Location[] = [];
  let typeFilter: number | undefined;
  let locationFilter: number | undefined;

  const loadData = async () => {
    try {
      const [devices, types, locs] = await Promise.all([
        api.devices.list({ status: 'available' }),
        api.deviceTypes.list(),
        api.locations.list(),
      ]);
      availableDevices = devices;
      deviceTypes = types;
      locations = locs;
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const getFilteredDevices = (): Device[] => {
    return availableDevices.filter(d => {
      if (typeFilter && d.device_type_id !== typeFilter) return false;
      if (locationFilter && d.location_id !== locationFilter) return false;
      return true;
    });
  };

  const showBorrowModal = (device: Device) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">设备</label>
        <div style="padding: 0.5rem; background: #f7fafc; border-radius: 4px;">
          ${device.asset_number} - ${device.name}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">预计归还日期</label>
        <input type="date" class="form-input" id="return-date" required>
      </div>
      <div class="form-group">
        <label class="form-label">借用用途</label>
        <textarea class="form-textarea" id="borrow-purpose" placeholder="请输入借用用途" required></textarea>
      </div>
    `;

    showModal(`借用设备 - ${device.name}`, content, async () => {
      const expectedReturnDate = (content.querySelector('#return-date') as HTMLInputElement).value;
      const borrowPurpose = (content.querySelector('#borrow-purpose') as HTMLTextAreaElement).value;

      if (!expectedReturnDate || !borrowPurpose) {
        showAlert('请填写完整信息');
        return false;
      }

      try {
        await api.borrowRecords.create({
          device: device.id,
          expected_return_date: expectedReturnDate,
          borrow_purpose: borrowPurpose,
        });
        showAlert('借用成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '借用失败');
        return false;
      }
    });
  };

  const render = () => {
    const filtered = getFilteredDevices();

    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">借用设备</h2>
      </div>

      <div class="filters">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">设备类型</label>
          <select class="form-select" id="filter-type">
            <option value="">全部</option>
            ${deviceTypes.map(t => `<option value="${t.id}" ${typeFilter === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">存放位置</label>
          <select class="form-select" id="filter-location">
            <option value="">全部</option>
            ${locations.map(l => `<option value="${l.id}" ${locationFilter === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
          </select>
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
            <th>周转次数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length > 0 ? filtered.map(device => `
            <tr>
              <td>${device.asset_number}</td>
              <td>${device.name}</td>
              <td>${device.device_type_name}</td>
              <td>${device.location_name}</td>
              <td><span class="${getStatusBadgeClass(device.status)}">${device.status_display}</span></td>
              <td>${device.turnover_count}</td>
              <td>
                <button class="btn btn-sm btn-success borrow-btn" data-id="${device.id}">借用</button>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="7" class="empty-state">暂无可借用设备</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    (container.querySelector('#filter-type') as HTMLSelectElement).onchange = (e) => {
      typeFilter = (e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : undefined;
      render();
    };
    (container.querySelector('#filter-location') as HTMLSelectElement).onchange = (e) => {
      locationFilter = (e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : undefined;
      render();
    };

    container.querySelectorAll('.borrow-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deviceId = Number(btn.getAttribute('data-id'));
        const device = availableDevices.find(d => d.id === deviceId);
        if (device) showBorrowModal(device);
      });
    });
  };

  await loadData();
  return container;
}
