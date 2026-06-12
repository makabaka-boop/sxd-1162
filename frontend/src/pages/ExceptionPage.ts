import { api } from '../api';
import { auth } from '../utils/auth';
import { formatDateTime, getStatusBadgeClass, getExceptionTypeText, getReviewStatusText } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { ExceptionRecord, Device } from '../types';

export async function ExceptionPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let records: ExceptionRecord[] = [];
  let devices: Device[] = [];
  let reviewFilter: string | undefined;
  let typeFilter: string | undefined;

  const loadData = async () => {
    try {
      const [exceptions, allDevices] = await Promise.all([
        api.exceptionRecords.list({ review_status: reviewFilter, exception_type: typeFilter }),
        api.devices.list(),
      ]);
      records = exceptions;
      devices = allDevices;
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const getFilteredRecords = (): ExceptionRecord[] => {
    return records;
  };

  const showReportModal = () => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">选择设备</label>
        <select class="form-select" id="exception-device" required>
          <option value="">请选择设备</option>
          ${devices.map(d => `<option value="${d.id}">${d.asset_number} - ${d.name} (${d.status_display})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">异常类型</label>
        <select class="form-select" id="exception-type" required>
          <option value="">请选择异常类型</option>
          <option value="damage">损坏</option>
          <option value="loss">丢失</option>
          <option value="missing_maintenance">维护缺失</option>
          <option value="other">其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">异常描述</label>
        <textarea class="form-textarea" id="exception-desc" placeholder="请详细描述异常情况" required></textarea>
      </div>
    `;

    showModal('上报异常', content, async () => {
      const deviceId = Number((content.querySelector('#exception-device') as HTMLSelectElement).value);
      const exceptionType = (content.querySelector('#exception-type') as HTMLSelectElement).value;
      const description = (content.querySelector('#exception-desc') as HTMLTextAreaElement).value;

      if (!deviceId || !exceptionType || !description) {
        showAlert('请填写完整信息');
        return false;
      }

      try {
        await api.exceptionRecords.create({
          device: deviceId,
          exception_type: exceptionType,
          description,
        });
        showAlert('异常上报成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '上报失败');
        return false;
      }
    });
  };

  const render = () => {
    const filtered = getFilteredRecords();

    const canReport = auth.hasRole(['admin', 'employee']);
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">异常记录</h2>
        ${canReport ? '<button class="btn btn-warning" id="report-exception-btn">上报异常</button>' : ''}
      </div>

      <div class="filters">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">复核状态</label>
          <select class="form-select" id="filter-review">
            <option value="">全部</option>
            <option value="pending" ${reviewFilter === 'pending' ? 'selected' : ''}>待复核</option>
            <option value="approved" ${reviewFilter === 'approved' ? 'selected' : ''}>已通过</option>
            <option value="rejected" ${reviewFilter === 'rejected' ? 'selected' : ''}>已驳回</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">异常类型</label>
          <select class="form-select" id="filter-type">
            <option value="">全部</option>
            <option value="damage" ${typeFilter === 'damage' ? 'selected' : ''}>损坏</option>
            <option value="loss" ${typeFilter === 'loss' ? 'selected' : ''}>丢失</option>
            <option value="overdue" ${typeFilter === 'overdue' ? 'selected' : ''}>逾期未还</option>
            <option value="missing_maintenance" ${typeFilter === 'missing_maintenance' ? 'selected' : ''}>维护缺失</option>
            <option value="other" ${typeFilter === 'other' ? 'selected' : ''}>其他</option>
          </select>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>资产编号</th>
            <th>设备名称</th>
            <th>上报人</th>
            <th>上报时间</th>
            <th>异常类型</th>
            <th>描述</th>
            <th>复核状态</th>
            <th>复核人</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length > 0 ? filtered.map(record => `
            <tr>
              <td>${record.asset_number}</td>
              <td>${record.device_name}</td>
              <td>${record.reporter_name}</td>
              <td>${formatDateTime(record.reported_date)}</td>
              <td>${record.exception_type_display}</td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.description}</td>
              <td>
                <span class="badge ${record.review_status === 'approved' ? 'badge-available' : record.review_status === 'rejected' ? 'badge-decommissioned' : 'badge-exception-pending'}">
                  ${record.review_status_display}
                </span>
              </td>
              <td>${record.reviewer_name || '-'}</td>
            </tr>
          `).join('') : `
            <tr><td colspan="8" class="empty-state">暂无异常记录</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const reportBtn = container.querySelector('#report-exception-btn');
    if (reportBtn) {
      reportBtn.addEventListener('click', showReportModal);
    }

    (container.querySelector('#filter-review') as HTMLSelectElement).onchange = (e) => {
      reviewFilter = (e.target as HTMLSelectElement).value || undefined;
      loadData();
    };
    (container.querySelector('#filter-type') as HTMLSelectElement).onchange = (e) => {
      typeFilter = (e.target as HTMLSelectElement).value || undefined;
      loadData();
    };
  };

  await loadData();
  return container;
}
