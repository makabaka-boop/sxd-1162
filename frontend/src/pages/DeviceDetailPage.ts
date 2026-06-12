import { api } from '../api';
import { formatDate, formatDateTime, getStatusBadgeClass } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { DeviceDetail, BorrowRecord, MaintenanceRecord, ExceptionRecord, Reservation } from '../types';

interface TimelineItem {
  type: 'borrow' | 'return' | 'maintenance' | 'exception' | 'reservation' | 'reservation_cancel';
  date: string;
  title: string;
  content: string;
}

export async function DeviceDetailPage(params?: Record<string, string>): Promise<HTMLElement> {
  const container = document.createElement('div');

  if (!params || !params.id) {
    container.innerHTML = '<div class="alert alert-error">设备ID不存在</div>';
    return container;
  }

  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let device: DeviceDetail | null = null;
  let activeTab = 'info';

  const loadData = async () => {
    try {
      device = await api.devices.detail(Number(params!.id));
      render();
    } catch (error) {
      container.innerHTML = `<div class="alert alert-error">${error instanceof Error ? error.message : '加载失败'}</div>`;
    }
  };

  const showReserveModal = () => {
    if (!device) return;
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
          device: device!.id,
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

  const getTimeline = (): TimelineItem[] => {
    if (!device) return [];
    const items: TimelineItem[] = [];

    device.borrow_records.forEach((record: BorrowRecord) => {
      items.push({
        type: 'borrow',
        date: record.borrow_date,
        title: `设备借用 - ${record.borrower_name}`,
        content: `用途: ${record.borrow_purpose}<br>预计归还: ${formatDate(record.expected_return_date)}`,
      });
      if (record.returned) {
        items.push({
          type: 'return',
          date: record.actual_return_date || record.borrow_date,
          title: `设备归还 - ${record.borrower_name}`,
          content: `
            ${record.return_notes ? `归还说明: ${record.return_notes}<br>` : ''}
            ${record.damage_notes ? `损坏说明: ${record.damage_notes}<br>` : ''}
            归还时间: ${formatDateTime(record.actual_return_date)}
          `,
        });
      }
    });

    device.maintenance_records.forEach((record: MaintenanceRecord) => {
      items.push({
        type: 'maintenance',
        date: record.maintenance_date,
        title: `设备维护 - ${record.operator_name}`,
        content: `
          类型: ${record.maintenance_type}<br>
          说明: ${record.description}<br>
          结果: ${record.result}
        `,
      });
    });

    device.exception_records.forEach((record: ExceptionRecord) => {
      items.push({
        type: 'exception',
        date: record.reported_date,
        title: `异常上报 - ${record.reporter_name}`,
        content: `
          类型: ${record.exception_type_display}<br>
          描述: ${record.description}<br>
          状态: ${record.review_status_display}
          ${record.reviewer ? `<br>复核人: ${record.reviewer_name}<br>复核结果: ${record.review_result}` : ''}
        `,
      });
    });

    device.reservation_records.forEach((record: Reservation) => {
      if (record.status === 'cancelled') {
        items.push({
          type: 'reservation_cancel',
          date: record.created_at,
          title: `预约取消 - ${record.user_name}`,
          content: `用途: ${record.purpose}<br>预计借用: ${formatDate(record.expected_borrow_date)} ~ 归还: ${formatDate(record.expected_return_date)}`,
        });
      } else {
        items.push({
          type: 'reservation',
          date: record.created_at,
          title: `设备预约 - ${record.user_name}`,
          content: `用途: ${record.purpose}<br>预计借用: ${formatDate(record.expected_borrow_date)} ~ 归还: ${formatDate(record.expected_return_date)}<br>状态: ${record.status_display}${record.notified_at ? `<br>通知时间: ${formatDateTime(record.notified_at)}` : ''}`,
        });
      }
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    if (!device) return;

    const timeline = getTimeline();

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>设备详情</h2>
        <div style="display: flex; gap: 0.5rem;">
          ${device.status === 'borrowed' ? '<button class="btn btn-warning" id="reserve-btn">预约此设备</button>' : ''}
          <a href="#/devices" class="btn btn-secondary">返回列表</a>
        </div>
      </div>

      <div class="card">
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">资产编号</div>
            <div class="detail-value">${device.asset_number}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">设备名称</div>
            <div class="detail-value">${device.name}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">设备类型</div>
            <div class="detail-value">${device.device_type_name}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">存放位置</div>
            <div class="detail-value">${device.location_name}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">当前状态</div>
            <div class="detail-value">
              <span class="${getStatusBadgeClass(device.status)}">${device.status_display}</span>
              ${device.is_overdue ? '<span class="badge badge-overdue" style="margin-left: 0.5rem;">逾期</span>' : ''}
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-label">周转次数</div>
            <div class="detail-value">${device.turnover_count}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">采购日期</div>
            <div class="detail-value">${formatDate(device.purchase_date)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">最后维护</div>
            <div class="detail-value">${formatDateTime(device.last_maintenance_date)}</div>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">规格参数</div>
          <div class="detail-value">${device.specification || '-'}</div>
        </div>
      </div>

      <div class="card">
        <div class="tabs">
          <div class="tab ${activeTab === 'info' ? 'active' : ''}" data-tab="info">基本信息</div>
          <div class="tab ${activeTab === 'timeline' ? 'active' : ''}" data-tab="timeline">完整轨迹 (${timeline.length})</div>
          <div class="tab ${activeTab === 'borrow' ? 'active' : ''}" data-tab="borrow">借用记录 (${device.borrow_records.length})</div>
          <div class="tab ${activeTab === 'reservation' ? 'active' : ''}" data-tab="reservation">预约记录 (${device.reservation_records.length})</div>
          <div class="tab ${activeTab === 'maintenance' ? 'active' : ''}" data-tab="maintenance">维护记录 (${device.maintenance_records.length})</div>
          <div class="tab ${activeTab === 'exception' ? 'active' : ''}" data-tab="exception">异常记录 (${device.exception_records.length})</div>
        </div>

        <div id="tab-content">
          ${renderTabContent()}
        </div>
      </div>
    `;

    bindEvents();
  };

  const renderTabContent = (): string => {
    if (!device) return '';

    switch (activeTab) {
      case 'timeline':
        const timeline = getTimeline();
        return `
          <div class="timeline">
            ${timeline.length > 0 ? timeline.map(item => `
              <div class="timeline-item ${item.type}">
                <div class="timeline-date">${formatDateTime(item.date)}</div>
                <div class="timeline-title">${item.title}</div>
                <div class="timeline-content">${item.content}</div>
              </div>
            `).join('') : '<div class="empty-state">暂无轨迹记录</div>'}
          </div>
        `;

      case 'borrow':
        return `
          <table class="table">
            <thead>
              <tr>
                <th>借用人</th>
                <th>借用时间</th>
                <th>预计归还</th>
                <th>实际归还</th>
                <th>用途</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${device.borrow_records.length > 0 ? device.borrow_records.map((r: BorrowRecord) => `
                <tr>
                  <td>${r.borrower_name}</td>
                  <td>${formatDateTime(r.borrow_date)}</td>
                  <td>${formatDate(r.expected_return_date)}</td>
                  <td>${formatDateTime(r.actual_return_date)}</td>
                  <td>${r.borrow_purpose}</td>
                  <td>
                    ${r.returned ? '<span class="badge badge-available">已归还</span>' : '<span class="badge badge-borrowed">借用中</span>'}
                    ${r.is_overdue ? '<span class="badge badge-overdue" style="margin-left: 0.25rem;">逾期</span>' : ''}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty-state">暂无借用记录</td></tr>'}
            </tbody>
          </table>
        `;

      case 'reservation':
        return `
          <table class="table">
            <thead>
              <tr>
                <th>预约人</th>
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
              ${device.reservation_records.length > 0 ? device.reservation_records.map((r: Reservation) => `
                <tr>
                  <td>${r.user_name}</td>
                  <td>${formatDate(r.expected_borrow_date)}</td>
                  <td>${formatDate(r.expected_return_date)}</td>
                  <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.purpose}</td>
                  <td><span class="${getReservationStatusBadge(r.status)}">${r.status_display}</span></td>
                  <td>${formatDateTime(r.created_at)}</td>
                  <td>${formatDateTime(r.notified_at)}</td>
                  <td>
                    ${r.status === 'pending' || r.status === 'notified'
                      ? `<button class="btn btn-sm btn-danger detail-cancel-reserve-btn" data-id="${r.id}">取消</button>`
                      : '-'
                    }
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="8" class="empty-state">暂无预约记录</td></tr>'}
            </tbody>
          </table>
        `;

      case 'maintenance':
        return `
          <table class="table">
            <thead>
              <tr>
                <th>操作人</th>
                <th>维护时间</th>
                <th>维护类型</th>
                <th>说明</th>
                <th>结果</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${device.maintenance_records.length > 0 ? device.maintenance_records.map((r: MaintenanceRecord) => `
                <tr>
                  <td>${r.operator_name}</td>
                  <td>${formatDateTime(r.maintenance_date)}</td>
                  <td>${r.maintenance_type}</td>
                  <td>${r.description}</td>
                  <td>${r.result}</td>
                  <td>
                    ${r.completed ? '<span class="badge badge-available">已完成</span>' : '<span class="badge badge-pending-maintenance">进行中</span>'}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty-state">暂无维护记录</td></tr>'}
            </tbody>
          </table>
        `;

      case 'exception':
        return `
          <table class="table">
            <thead>
              <tr>
                <th>上报人</th>
                <th>上报时间</th>
                <th>异常类型</th>
                <th>描述</th>
                <th>复核状态</th>
                <th>复核人</th>
              </tr>
            </thead>
            <tbody>
              ${device.exception_records.length > 0 ? device.exception_records.map((r: ExceptionRecord) => `
                <tr>
                  <td>${r.reporter_name}</td>
                  <td>${formatDateTime(r.reported_date)}</td>
                  <td>${r.exception_type_display}</td>
                  <td>${r.description}</td>
                  <td>
                    <span class="badge ${r.review_status === 'approved' ? 'badge-available' : r.review_status === 'rejected' ? 'badge-decommissioned' : 'badge-exception-pending'}">
                      ${r.review_status_display}
                    </span>
                  </td>
                  <td>${r.reviewer_name || '-'}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty-state">暂无异常记录</td></tr>'}
            </tbody>
          </table>
        `;

      default:
        return `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
            <div class="card" style="margin-bottom: 0;">
              <h4 style="margin-bottom: 0.75rem;">当前借用人</h4>
              ${device.current_borrower ? `
                <p><strong>姓名:</strong> ${device.current_borrower.real_name}</p>
                <p><strong>借用时间:</strong> ${formatDateTime(device.current_borrower.borrow_date)}</p>
                <p><strong>预计归还:</strong> ${formatDate(device.current_borrower.expected_return_date)}</p>
              ` : '<p style="color: #718096;">设备当前未借出</p>'}
            </div>
            <div class="card" style="margin-bottom: 0;">
              <h4 style="margin-bottom: 0.75rem;">设备统计</h4>
              <p><strong>总周转次数:</strong> ${device.turnover_count}</p>
              <p><strong>借用记录:</strong> ${device.borrow_records.length} 条</p>
              <p><strong>预约记录:</strong> ${device.reservation_records.length} 条</p>
              <p><strong>维护记录:</strong> ${device.maintenance_records.length} 条</p>
              <p><strong>异常记录:</strong> ${device.exception_records.length} 条</p>
            </div>
          </div>
        `;
    }
  };

  const bindEvents = () => {
    const tabs = container.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.getAttribute('data-tab') || 'info';
        const tabContent = container.querySelector('#tab-content');
        if (tabContent) {
          tabContent.innerHTML = renderTabContent();
        }
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        bindDetailEvents();
      });
    });

    const reserveBtn = container.querySelector('#reserve-btn');
    if (reserveBtn) {
      reserveBtn.addEventListener('click', showReserveModal);
    }

    bindDetailEvents();
  };

  const bindDetailEvents = () => {
    container.querySelectorAll('.detail-cancel-reserve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const reservationId = Number(btn.getAttribute('data-id'));
        const reservation = device?.reservation_records.find(r => r.id === reservationId);
        if (reservation) cancelReservation(reservation);
      });
    });
  };

  await loadData();
  return container;
}
