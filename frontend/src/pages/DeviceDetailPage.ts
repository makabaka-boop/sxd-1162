import { api } from '../api';
import { formatDate, formatDateTime, getStatusBadgeClass } from '../utils/format';
import { showAlert } from '../components/Modal';
import type { DeviceDetail, BorrowRecord, MaintenanceRecord, ExceptionRecord } from '../types';

interface TimelineItem {
  type: 'borrow' | 'return' | 'maintenance' | 'exception';
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

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const render = () => {
    if (!device) return;

    const timeline = getTimeline();

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>设备详情</h2>
        <a href="#/devices" class="btn btn-secondary">返回列表</a>
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
      });
    });
  };

  await loadData();
  return container;
}
