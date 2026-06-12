import { api } from '../api';
import { formatDateTime } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { ExceptionRecord } from '../types';

export async function ExceptionReviewPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let records: ExceptionRecord[] = [];

  const loadData = async () => {
    try {
      records = await api.exceptionRecords.list({ review_status: 'pending' });
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const showReviewModal = (record: ExceptionRecord) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">设备</label>
        <div style="padding: 0.5rem; background: #f7fafc; border-radius: 4px;">
          ${record.asset_number} - ${record.device_name}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">异常类型</label>
        <div style="padding: 0.5rem; background: #fefcbf; border-radius: 4px; color: #744210;">
          ${record.exception_type_display}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">上报人</label>
        <div style="padding: 0.5rem; background: #f7fafc; border-radius: 4px;">
          ${record.reporter_name} - ${formatDateTime(record.reported_date)}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">异常描述</label>
        <div style="padding: 0.75rem; background: #fff5f5; border-radius: 4px; border-left: 3px solid #f56565;">
          ${record.description}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">复核结果</label>
        <textarea class="form-textarea" id="review-result" placeholder="请输入复核意见" required></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">复核操作</label>
        <select class="form-select" id="review-action" required>
          <option value="approve">通过</option>
          <option value="reject">驳回</option>
        </select>
      </div>
    `;

    showModal(`复核异常 - ${record.device_name}`, content, async () => {
      const reviewResult = (content.querySelector('#review-result') as HTMLTextAreaElement).value;
      const action = (content.querySelector('#review-action') as HTMLSelectElement).value;

      if (!reviewResult) {
        showAlert('请输入复核意见');
        return;
      }

      try {
        await api.exceptionRecords.review(record.id, {
          review_result: reviewResult,
          action,
        });
        showAlert('复核成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '复核失败');
      }
    });
  };

  const render = () => {
    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">异常复核</h2>
        <span class="badge badge-exception-pending" style="padding: 0.5rem 0.75rem;">
          待复核: ${records.length} 条
        </span>
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
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${records.length > 0 ? records.map(record => `
            <tr>
              <td>${record.asset_number}</td>
              <td>${record.device_name}</td>
              <td>${record.reporter_name}</td>
              <td>${formatDateTime(record.reported_date)}</td>
              <td>
                <span class="badge badge-exception-pending">
                  ${record.exception_type_display}
                </span>
              </td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.description}</td>
              <td>
                <button class="btn btn-sm btn-primary review-btn" data-id="${record.id}">复核</button>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="7" class="empty-state">暂无待复核异常</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    container.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = Number(btn.getAttribute('data-id'));
        const record = records.find(r => r.id === recordId);
        if (record) showReviewModal(record);
      });
    });
  };

  await loadData();
  return container;
}
