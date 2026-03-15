import type { RoundStatus, JobStatus } from './types';

export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  pending: '待结果',
  passed: '已通过',
  failed: '已挂',
  offer: 'Offer',
};

export const ROUND_STATUS_COLOR: Record<RoundStatus, string> = {
  pending: 'var(--status-pending)',
  passed: 'var(--status-passed)',
  failed: 'var(--status-failed)',
  offer: 'var(--status-offer)',
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  active: '进行中',
  offer: 'Offer',
  closed: '已结束',
};

export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  active: 'var(--status-pending)',
  offer: 'var(--status-offer)',
  closed: 'var(--status-ghost)',
};

export function formatDate(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const base = `${month}月${day}日`;
  return timeStr ? `${base} ${timeStr}` : base;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}天前`;
  return formatDate(new Date(ts).toISOString().slice(0, 10));
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
