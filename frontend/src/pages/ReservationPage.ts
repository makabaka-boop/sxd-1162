import { api } from '../api';
import { formatDate, formatDateTime } from '../utils/format';
import { showAlert } from '../components/Modal';
import type { Reservation } from '../types';

export async function ReservationPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let reservations: Reservation[] = [];
  let activeTab = 'all';

  const loadData = async () => {
    try {
      const statusFilter = activeTab === 'all' ? undefined : activeTab;
      reservations = await api.reservations.list({ status: statusFilter });
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
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
    const pendingCount = reservations.filter(r => r.status === 'pending').length;
    const notifiedCount = reservations.filter(r => r.status === 'notified').length;

    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">我的预约</h2>
      </div>

      <div class="tabs" style="margin-bottom: 1.5rem;">
        <div class="tab ${activeTab === 'all' ? 'active' : ''}" data-tab="all">全部 (${reservations.length})</div>
        <div class="tab ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">待处理 (${pendingCount})</div>
        <div class="tab ${activeTab === 'notified' ? 'active' : ''}" data-tab="notified">已通知 (${notifiedCount})</div>
        <div class="tab ${activeTab === 'fulfilled' ? 'active' : ''}" data-tab="fulfilled">已借出</div>
        <div class="tab ${activeTab === 'cancelled' ? 'active' : ''}" data-tab="cancelled">已取消</div>
      </div>

      ${notifiedCount > 0 && activeTab !== 'cancelled' ? `
        <div class="alert alert-success" style="margin-bottom: 1rem;">
          您有 ${notifiedCount} 条预约已被通知，设备已归还，请尽快前往借用！
        </div>
      ` : ''}

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
            <th>通知时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${reservations.length > 0 ? reservations.map(r => `
            <tr>
              <td>${r.asset_number}</td>
              <td>${r.device_name}</td>
              <td>${formatDate(r.expected_borrow_date)}</td>
              <td>${formatDate(r.expected_return_date)}</td>
              <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.purpose}</td>
              <td><span class="${getReservationStatusBadge(r.status)}">${r.status_display}</span></td>
              <td>${formatDateTime(r.created_at)}</td>
              <td>${formatDateTime(r.notified_at)}</td>
              <td>
                ${r.status === 'pending'
                  ? `<button class="btn btn-sm btn-danger cancel-reserve-btn" data-id="${r.id}">取消</button>`
                  : r.status === 'notified'
                    ? `<a href="#/devices/${r.device}" class="btn btn-sm btn-success">前往借用</a> <button class="btn btn-sm btn-danger cancel-reserve-btn" data-id="${r.id}">取消</button>`
                    : '-'
                }
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="9" class="empty-state">暂无预约记录</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const tabs = container.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.getAttribute('data-tab') || 'all';
        loadData();
      });
    });

    container.querySelectorAll('.cancel-reserve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const reservationId = Number(btn.getAttribute('data-id'));
        const reservation = reservations.find(r => r.id === reservationId);
        if (reservation) cancelReservation(reservation);
      });
    });
  };

  await loadData();
  return container;
}
