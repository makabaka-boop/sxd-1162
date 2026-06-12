import { api } from '../api';
import { formatDate, getStatusBadgeClass } from '../utils/format';
import { showAlert, showModal } from '../components/Modal';
import type { BorrowRecord } from '../types';

export async function ReturnPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  let borrowRecords: BorrowRecord[] = [];

  const loadData = async () => {
    try {
      borrowRecords = await api.borrowRecords.list();
      render();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : '加载失败');
    }
  };

  const getMyBorrowed = (): BorrowRecord[] => {
    return borrowRecords.filter(r => !r.returned);
  };

  const showReturnModal = (record: BorrowRecord) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">设备</label>
        <div style="padding: 0.5rem; background: #f7fafc; border-radius: 4px;">
          ${record.asset_number} - ${record.device_name}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">借用时间</label>
        <div style="padding: 0.5rem; background: #f7fafc; border-radius: 4px;">
          ${formatDate(record.borrow_date)}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">预计归还日期</label>
        <div style="padding: 0.5rem; background: ${record.is_overdue ? '#fed7d7' : '#f7fafc'}; border-radius: 4px;">
          ${formatDate(record.expected_return_date)}
          ${record.is_overdue ? '<span class="badge badge-overdue" style="margin-left: 0.5rem;">已逾期</span>' : ''}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">归还说明</label>
        <textarea class="form-textarea" id="return-notes" placeholder="请输入归还说明（可选）"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">损坏说明</label>
        <textarea class="form-textarea" id="damage-notes" placeholder="如有损坏请说明（可选）"></textarea>
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox" id="needs-maintenance">
          <span>设备需要维护</span>
        </label>
      </div>
    `;

    showModal(`归还设备 - ${record.device_name}`, content, async () => {
      const returnNotes = (content.querySelector('#return-notes') as HTMLTextAreaElement).value;
      const damageNotes = (content.querySelector('#damage-notes') as HTMLTextAreaElement).value;
      const needsMaintenance = (content.querySelector('#needs-maintenance') as HTMLInputElement).checked;

      try {
        await api.borrowRecords.returnDevice(record.id, {
          return_notes: returnNotes,
          damage_notes: damageNotes,
          needs_maintenance: needsMaintenance,
        });
        showAlert('归还成功', 'success');
        loadData();
      } catch (error) {
        showAlert(error instanceof Error ? error.message : '归还失败');
      }
    });
  };

  const render = () => {
    const myRecords = getMyBorrowed();

    container.innerHTML = `
      <div class="card-header" style="margin-bottom: 1rem;">
        <h2 class="card-title">归还设备</h2>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>资产编号</th>
            <th>设备名称</th>
            <th>借用时间</th>
            <th>预计归还</th>
            <th>用途</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${myRecords.length > 0 ? myRecords.map(record => `
            <tr>
              <td>${record.asset_number}</td>
              <td>${record.device_name}</td>
              <td>${formatDate(record.borrow_date)}</td>
              <td>
                ${formatDate(record.expected_return_date)}
                ${record.is_overdue ? '<span class="badge badge-overdue" style="margin-left: 0.5rem;">逾期</span>' : ''}
              </td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.borrow_purpose}</td>
              <td><span class="${getStatusBadgeClass('borrowed')}">借用中</span></td>
              <td>
                <button class="btn btn-sm btn-success return-btn" data-id="${record.id}">归还</button>
              </td>
            </tr>
          `).join('') : `
            <tr><td colspan="7" class="empty-state">暂无待归还设备</td></tr>
          `}
        </tbody>
      </table>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    container.querySelectorAll('.return-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = Number(btn.getAttribute('data-id'));
        const record = borrowRecords.find(r => r.id === recordId);
        if (record) showReturnModal(record);
      });
    });
  };

  await loadData();
  return container;
}
