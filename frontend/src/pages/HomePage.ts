import { api } from '../api';
import { getExceptionTypeText } from '../utils/format';

export async function HomePage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;">加载中...</div>';

  try {
    const [stats, overdue] = await Promise.all([
      api.statistics.get(),
      api.statistics.checkOverdue().catch(() => ({ overdue_count: 0, auto_created_exceptions: [] })),
    ]);

    const exceptionLabels: Record<string, string> = {
      damage: '损坏',
      loss: '丢失',
      overdue: '逾期',
      missing_maintenance: '维护缺失',
      other: '其他',
    };

    const maxException = Math.max(...Object.values(stats.exception_distribution), 1);

    container.innerHTML = `
      <h2 style="margin-bottom: 1.5rem;">统计概览</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <h3>设备周转次数</h3>
          <div class="stat-value">${stats.total_turnover}</div>
        </div>
        <div class="stat-card warning">
          <h3>待维护设备</h3>
          <div class="stat-value">${stats.pending_maintenance}</div>
        </div>
        <div class="stat-card danger">
          <h3>逾期未还</h3>
          <div class="stat-value">${overdue.overdue_count}</div>
        </div>
        <div class="stat-card info">
          <h3>待处理预约</h3>
          <div class="stat-value">${stats.pending_reservations}</div>
        </div>
        <div class="stat-card success">
          <h3>库存不足类型</h3>
          <div class="stat-value">${stats.low_stock_types.length}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="chart-container">
          <h3 class="chart-title">异常类型分布</h3>
          <div class="bar-chart">
            ${Object.entries(stats.exception_distribution).map(([type, count]) => `
              <div class="bar-item">
                <div class="bar-label">${exceptionLabels[type] || getExceptionTypeText(type)}</div>
                <div style="flex:1; height: 24px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <div class="bar-fill" style="width: ${(count / maxException) * 100}%">
                    ${count}
                  </div>
                </div>
              </div>
            `).join('')}
            ${Object.keys(stats.exception_distribution).length === 0 ? '<div class="empty-state">暂无异常数据</div>' : ''}
          </div>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">库存不足预警</h3>
          ${stats.low_stock_types.length > 0 ? stats.low_stock_types.map(item => `
            <div class="low-stock-item">
              <div>
                <div style="font-weight: 500;">${item.name}</div>
                <div style="font-size: 0.75rem; color: #718096;">
                  可用: ${item.available} / 总数: ${item.total}
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${(item.available / item.threshold) * 100}%; background: #f56565;"></div>
                </div>
              </div>
              <span class="badge" style="background: #fed7d7; color: #c53030;">
                阈值: ${item.threshold}
              </span>
            </div>
          `).join('') : '<div class="empty-state">所有设备类型库存充足</div>'}
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">${error instanceof Error ? error.message : '加载失败'}</div>`;
  }

  return container;
}
