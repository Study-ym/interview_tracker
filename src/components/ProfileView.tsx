import type { JobApplication } from '../types';
import type { AuthUser } from '../auth';

interface Props {
  user: AuthUser | null;
  jobs: JobApplication[];
  onLogout: () => void;
}

function exportAsJson(jobs: JobApplication[]) {
  const data = {
    exportedAt: new Date().toISOString(),
    count: jobs.length,
    jobs: jobs.map(j => ({
      company: j.company,
      position: j.position,
      salary: j.salary,
      tags: j.tags,
      notes: j.notes,
      status: j.status,
      rounds: j.rounds.map(r => ({
        name: r.name,
        date: r.date,
        time: r.time,
        status: r.status,
        location: r.location,
        interviewer: r.interviewer,
        notes: r.notes,
        questions: r.questions.map(q => ({
          content: q.content,
          answer: q.answer,
          tags: q.tags,
        })),
      })),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `面试日志-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsMarkdown(jobs: JobApplication[]) {
  const lines: string[] = ['# 面试日志导出', '', `导出时间：${new Date().toLocaleString('zh-CN')}`, ''];

  for (const j of jobs) {
    lines.push(`## ${j.company} - ${j.position}`);
    lines.push('');
    if (j.salary) lines.push(`- 薪资：${j.salary}`);
    if (j.tags.length) lines.push(`- 标签：${j.tags.join(', ')}`);
    lines.push(`- 状态：${j.status}`);
    if (j.notes) {
      lines.push('');
      lines.push('### 整体备注');
      lines.push('');
      lines.push(j.notes);
      lines.push('');
    }
    for (const r of j.rounds) {
      lines.push(`### ${r.name || '面试轮次'} (${r.date} ${r.time || ''})`);
      lines.push('');
      if (r.notes) lines.push(r.notes + '\n');
      for (const q of r.questions) {
        lines.push('- **题目**：' + q.content.replace(/\n/g, ' '));
        if (q.answer) lines.push('  - 回答/思路：' + q.answer.replace(/\n/g, ' '));
        if (q.tags.length) lines.push('  - 标签：' + q.tags.join(', '));
        lines.push('');
      }
    }
    lines.push('---');
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `面试日志-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProfileView({ user, jobs, onLogout }: Props) {
  const totalJobs = jobs.length;
  const totalRounds = jobs.reduce((s, j) => s + j.rounds.length, 0);
  const offerCount = jobs.filter(j => j.status === 'offer').length;
  const activeCount = jobs.filter(j => j.status === 'active').length;
  const closedCount = jobs.filter(j => j.status === 'closed').length;

  return (
    <div className="profile-view">
      <h2 className="profile-title">个人中心</h2>

      <section className="profile-section">
        <h3 className="section-label">账号信息</h3>
        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-label">手机号</span>
            <span className="profile-value">{user?.phone ? `+86 ${user.phone}` : '—'}</span>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <h3 className="section-label">数据统计</h3>
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-num">{totalJobs}</span>
            <span className="profile-stat-label">投递</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-num">{totalRounds}</span>
            <span className="profile-stat-label">面试轮次</span>
          </div>
          <div className="profile-stat profile-stat-accent">
            <span className="profile-stat-num">{offerCount}</span>
            <span className="profile-stat-label">Offer</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-num">{activeCount}</span>
            <span className="profile-stat-label">进行中</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-num">{closedCount}</span>
            <span className="profile-stat-label">已结束</span>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <h3 className="section-label">数据导出</h3>
        <div className="profile-actions">
          <button
            type="button"
            className="btn btn-outline profile-action-btn"
            onClick={() => exportAsJson(jobs)}
          >
            导出 JSON
          </button>
          <button
            type="button"
            className="btn btn-outline profile-action-btn"
            onClick={() => exportAsMarkdown(jobs)}
          >
            导出 Markdown
          </button>
        </div>
        <p className="profile-hint">导出当前账号下的全部投递与面试题目，便于备份或迁移。</p>
      </section>

      <section className="profile-section">
        <h3 className="section-label">关于</h3>
        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-label">面试日志</span>
            <span className="profile-value">记录每一次面试，复盘成长</span>
          </div>
        </div>
      </section>

      <div className="profile-logout-wrap">
        <button type="button" className="btn btn-danger profile-logout" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </div>
  );
}
