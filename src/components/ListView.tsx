import { useState } from 'react';
import type { JobApplication, JobStatus } from '../types';
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR, ROUND_STATUS_COLOR, ROUND_STATUS_LABEL, formatDate, timeAgo } from '../utils';

interface Props {
  jobs: JobApplication[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const ALL_STATUSES: JobStatus[] = ['active', 'offer', 'closed'];

export function ListView({ jobs, onSelect, onNew, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);

  const filtered = jobs.filter(j => {
    const matchSearch =
      !search ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.position.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: jobs.length,
    offer: jobs.filter(j => j.status === 'offer').length,
    active: jobs.filter(j => j.status === 'active').length,
    closed: jobs.filter(j => j.status === 'closed').length,
  };

  const totalRounds = jobs.reduce((s, j) => s + j.rounds.length, 0);

  return (
    <div className="list-view">
      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>还没有投递记录</h2>
          <p>以公司 + 岗位为单位，记录每一次求职历程</p>
          <button className="btn btn-primary" onClick={onNew}>开始记录</button>
        </div>
      ) : (
        <>
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">公司</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{totalRounds}</span>
              <span className="stat-label">总轮次</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num" style={{ color: 'var(--status-offer)' }}>{stats.offer}</span>
              <span className="stat-label">Offer</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num" style={{ color: 'var(--status-pending)' }}>{stats.active}</span>
              <span className="stat-label">进行中</span>
            </div>
          </div>

          <div className="toolbar">
            <input
              className="search-input"
              placeholder="搜索公司或岗位…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="filter-chips">
              <button
                className={`chip ${filterStatus === 'all' ? 'chip-active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >全部</button>
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  className={`chip ${filterStatus === s ? 'chip-active' : ''}`}
                  style={filterStatus === s ? { background: JOB_STATUS_COLOR[s] } : {}}
                  onClick={() => setFilterStatus(s)}
                >{JOB_STATUS_LABEL[s]}</button>
              ))}
            </div>
          </div>

          <div className="interview-list">
            {filtered.length === 0 ? (
              <div className="no-result">没有匹配的记录</div>
            ) : (
              filtered.map(job => {
                const latestRound = job.rounds[job.rounds.length - 1];
                return (
                  <div key={job.id} className="interview-card" onClick={() => onSelect(job.id)}>
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="card-company">{job.company}</span>
                        <span className="card-position">{job.position}{(job.department ?? '') && ` · ${job.department}`}</span>
                        {job.salary && <span className="card-round">{job.salary}</span>}
                      </div>
                      <span
                        className="status-badge"
                        style={{ background: JOB_STATUS_COLOR[job.status] }}
                      >{JOB_STATUS_LABEL[job.status]}</span>
                    </div>

                    {/* 轮次进度 */}
                    {job.rounds.length > 0 && (
                      <div className="rounds-progress">
                        {job.rounds.map((r, i) => (
                          <div key={r.id} className="round-pill">
                            <span
                              className="round-dot"
                              style={{ background: ROUND_STATUS_COLOR[r.status] }}
                            />
                            <span className="round-pill-name">{r.name || `第${i + 1}轮`}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="card-meta">
                      <span className="meta-q">🔄 {job.rounds.length} 轮面试</span>
                      {latestRound && (
                        <span className="meta-date">最近：{formatDate(latestRound.date, latestRound.time)}</span>
                      )}
                      {latestRound && (
                        <span
                          className="status-badge"
                          style={{ background: ROUND_STATUS_COLOR[latestRound.status], fontSize: '11px', padding: '2px 8px' }}
                        >{ROUND_STATUS_LABEL[latestRound.status]}</span>
                      )}
                    </div>

                    {job.notes && (
                      <p className="card-notes-preview">{job.notes.slice(0, 60)}{job.notes.length > 60 ? '…' : ''}</p>
                    )}

                    <div className="card-footer">
                      <span className="card-time">{timeAgo(job.updatedAt)}</span>
                      <button
                        className="btn-delete-card"
                        onClick={e => { e.stopPropagation(); setConfirmDelete(job.id); }}
                      >删除</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 打赏入口 */}
          <div className="tip-banner" onClick={() => setShowTip(true)}>
            <span className="tip-banner__icon">☕</span>
            <span className="tip-banner__text">如果面试本对你有帮助，请作者喝杯咖啡</span>
            <span className="tip-banner__arrow">›</span>
          </div>
        </>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>确认删除？</h3>
            <p>将删除该公司的所有面试日志，无法恢复。</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>取消</button>
              <button className="btn btn-danger" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}>删除</button>
            </div>
          </div>
        </div>
      )}

      {showTip && (
        <div className="modal-overlay" onClick={() => setShowTip(false)}>
          <div className="modal tip-modal" onClick={e => e.stopPropagation()}>
            <button className="tip-modal__close" onClick={() => setShowTip(false)}>✕</button>
            <div className="tip-modal__header">
              <span className="tip-modal__icon">☕</span>
              <h3 className="tip-modal__title">请作者喝杯咖啡</h3>
              <p className="tip-modal__desc">面试本完全免费，如果帮到你了，欢迎打赏支持一下 🙏</p>
            </div>
            <div className="tip-modal__qr-area">
              <div className="tip-qr-card">
                <div className="tip-qr-placeholder">
                  <span>微信收款码</span>
                  <span className="tip-qr-hint">替换为你的二维码图片</span>
                </div>
                <span className="tip-qr-label">微信扫一扫</span>
              </div>
              <div className="tip-qr-card">
                <div className="tip-qr-placeholder tip-qr-placeholder--alipay">
                  <span>支付宝收款码</span>
                  <span className="tip-qr-hint">替换为你的二维码图片</span>
                </div>
                <span className="tip-qr-label">支付宝扫一扫</span>
              </div>
            </div>
            <p className="tip-modal__thanks">感谢你的支持！每一份打赏都是继续更新的动力 ❤️</p>
          </div>
        </div>
      )}
    </div>
  );
}
