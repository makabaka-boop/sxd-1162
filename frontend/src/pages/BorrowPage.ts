import { api } from '../api';
import { formatDate, formatDateTime, getStatusBadgeClass } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { Device, DeviceType, Location, Reservation } from '../types';

export async function BorrowPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let availableDevices: Device[] = [];
  let deviceTypes: DeviceType[] = [];
  let locations: Location[] = [];
  let myReservations: Reservation[] = [];
  let notifiedReservations: Reservation[] = [];
  let typeFilter: number | undefined;
  let locationFilter: number | undefined;
  let activeTab = 'borrow';

  const loadData = async () => {
    try {
      const [devices, types, locs, reservations] = await Promise.all([
        api.devices.list({ status: 'available' }),
        api.deviceTypes.list(),
        api.locations.list(),
        api.reservations.list().catch(() => []),
      ]);
      availableDevices = devices;
      deviceTypes = types;
      locations = locs;
      myReservations = reservations;
      notifiedReservations = reservations.filter((r: Reservation) => r.status === 'notified');
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

  const showReserveModal = (device: Device) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">设备</label>
        <div style="padding: 0.5rem; background: #f7fafc; border-radius: 4px;">
          ${device.asset_number} - ${device.name}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">预计借用日期</label>
        <input type="date" class="form-input" id="reserve-borrow-date" required>
      </div>
      <div class="form-group">
        <label class="form-label">预计归还日期</label>
        <input type="date" class="form-input" id="reserve-return-date" required>
      </div>
      <div class="form-group">
        <label class="form-label">预约用途</label>
        <textarea class="form-textarea" id="reserve-purpose" placeholder="请输入预约用途" required></textarea>
      </div>
    `;

    showModal(`预约设备 - ${device.name}`, content, async () => {
      const expectedBorrowDate = (content.querySelector('#reserve-borrow-date') as HTMLInputElement).value;
      const expectedReturnDate = (content.querySelector('#reserve-return-date') as HTMLInputElement).value;
      const purpose = (content.querySelector('#reserve-purpose') as HTMLTextAreaElement).value;

      if (!expectedBorrowDate || !expectedReturnDate || !purpose) {
        showAlert('请填写完整信息');
        return false;
      }

      try {
        await api.reservations.create({
          device: device.id,
          expected_borrow_date: expectedBorrowDate,
          expected_return_date: expectedReturnDate,
          purpose,
        });
        showAlert('预约成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '预约失败');
        return false;
      }
    });
  };

  const cancelReservation = async (reservation: Reservation) => {
    if (!confirm('确定要取消此预约吗？')) return;
    try {
      await api.reservations.cancel(reservation.id);
      showAlert('取消成功', 'success');
      loadData();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '取消失败');
    }
  };

  const getReservationStatusBadge = (status: string): string => {
    const map: Record<string, string> = {
      pending: 'badge-pending-maintenance',
      notified: 'badge-borrowed',
      fulfilled: 'badge-available',
      cancelled: 'badge-decommissioned',
      expired: 'badge-decommissioned',
    };
    return `badge ${map[status] || ''}`;
  };

  const render = () => {
    const filtered = getFilteredDevices();

    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">借用设备</h2>
      </div>

      <div class="tabs" style="margin-bottom: 1.5rem;">
        <div class="tab ${activeTab === 'borrow' ? 'active' : ''}" data-tab="borrow">可借用设备</div>
        <div class="tab ${activeTab === 'my-reservations' ? 'active' : ''}" data-tab="my-reservations">我的预约 (${myReservations.length})</div>
        <div class="tab ${activeTab === 'notified' ? 'active' : ''}" data-tab="notified">待借用通知 (${notifiedReservations.length})</div>
      </div>

      <div id="tab-content">
        ${renderTabContent()}
      </div>
    `;

    bindEvents();
  };

  const renderTabContent = (): string => {
    switch (activeTab) {
      case 'my-reservations':
        return `
          <table class="table">
            <thead>
              <tr>
                <th>资产编号</th>
                <th>设备名称</th>
                <th>预计借用</th>
                <th>预计归还</th>
                <th>用途</th>
                <th>状态</th>
                <th>预约时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${myReservations.length > 0 ? myReservations.map(r => `
                <tr>
                  <td>${r.asset_number}</td>
                  <td>${r.device_name}</td>
                  <td>${formatDate(r.expected_borrow_date)}</td>
                  <td>${formatDate(r.expected_return_date)}</td>
                  <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.purpose}</td>
                  <td><span class="${getReservationStatusBadge(r.status)}">${r.status_display}</span></td>
                  <td>${formatDateTime(r.created_at)}</td>
                  <td>
                    ${r.status === 'pending' || r.status === 'notified'
                      ? `<button class="btn btn-sm btn-danger cancel-reserve-btn" data-id="${r.id}">取消</button>`
                      : '-'
                    }
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="8" class="empty-state">暂无预约记录</td></tr>
              `}
            </tbody>
          </table>
        `;

      case 'notified':
        return `
          ${notifiedReservations.length > 0 ? `
            <div class="alert alert-success" style="margin-bottom: 1rem;">
              以下设备已归还，您有优先借用权，请尽快前往借用！
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>资产编号</th>
                  <th>设备名称</th>
                  <th>预计借用</th>
                  <th>预计归还</th>
                  <th>用途</th>
                  <th>通知时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${notifiedReservations.map(r => `
                  <tr>
                    <td>${r.asset_number}</td>
                    <td>${r.device_name}</td>
                    <td>${formatDate(r.expected_borrow_date)}</td>
                    <td>${formatDate(r.expected_return_date)}</td>
                    <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.purpose}</td>
                    <td>${formatDateTime(r.notified_at)}</td>
                    <td>
                      <a href="#/devices/${r.device}" class="btn btn-sm btn-success">前往借用</a>
                      <button class="btn btn-sm btn-danger cancel-reserve-btn" data-id="${r.id}">取消预约</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="empty-state">暂无待借用通知</div>
          `}
        `;

      default:
        const filteredDevices = getFilteredDevices();
        return `
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
              ${filteredDevices.length > 0 ? filteredDevices.map(device => `
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
    }
  };

  const bindEvents = () => {
    const tabs = container.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.getAttribute('data-tab') || 'borrow';
        const tabContent = container.querySelector('#tab-content');
        if (tabContent) {
          tabContent.innerHTML = renderTabContent();
        }
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        bindTabEvents();
      });
    });

    bindTabEvents();
  };

  const bindTabEvents = () => {
    const filterType = container.querySelector('#filter-type') as HTMLSelectElement;
    const filterLocation = container.querySelector('#filter-location') as HTMLSelectElement;

    if (filterType) {
      filterType.onchange = (e) => {
        typeFilter = (e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : undefined;
        const tabContent = container.querySelector('#tab-content');
        if (tabContent) tabContent.innerHTML = renderTabContent();
        bindTabEvents();
      };
    }
    if (filterLocation) {
      filterLocation.onchange = (e) => {
        locationFilter = (e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : undefined;
        const tabContent = container.querySelector('#tab-content');
        if (tabContent) tabContent.innerHTML = renderTabContent();
        bindTabEvents();
      };
    }

    container.querySelectorAll('.borrow-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deviceId = Number(btn.getAttribute('data-id'));
        const device = availableDevices.find(d => d.id === deviceId);
        if (device) showBorrowModal(device);
      });
    });

    container.querySelectorAll('.reserve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deviceId = Number(btn.getAttribute('data-id'));
        const device = availableDevices.find(d => d.id === deviceId);
        if (device) showReserveModal(device);
      });
    });

    container.querySelectorAll('.cancel-reserve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const reservationId = Number(btn.getAttribute('data-id'));
        const reservation = myReservations.find(r => r.id === reservationId) || notifiedReservations.find(r => r.id === reservationId);
        if (reservation) cancelReservation(reservation);
      });
    });
  };

  await loadData();
  return container;
}
