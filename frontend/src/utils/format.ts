export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusBadgeClass = (status: string): string => {
  const classMap: Record<string, string> = {
    available: 'badge-available',
    borrowed: 'badge-borrowed',
    pending_maintenance: 'badge-pending-maintenance',
    exception_pending: 'badge-exception-pending',
    maintaining: 'badge-maintaining',
    recovered: 'badge-recovered',
    decommissioned: 'badge-decommissioned',
  };
  return `badge ${classMap[status] || ''}`;
};

export const getRoleBadgeClass = (role: string): string => {
  return `role-tag role-${role}`;
};

export const getRoleText = (role: string): string => {
  const map: Record<string, string> = {
    admin: '管理员',
    employee: '员工',
    supervisor: '主管',
  };
  return map[role] || role;
};

export const getExceptionTypeText = (type: string): string => {
  const map: Record<string, string> = {
    damage: '损坏',
    loss: '丢失',
    overdue: '逾期未还',
    missing_maintenance: '维护缺失',
    other: '其他',
  };
  return map[type] || type;
};

export const getReviewStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待复核',
    approved: '已通过',
    rejected: '已驳回',
  };
  return map[status] || status;
};
