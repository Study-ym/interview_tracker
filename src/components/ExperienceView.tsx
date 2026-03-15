import { useState, useMemo } from 'react';
import type { JobApplication, Question, Round } from '../types';

export type QuestionWithContext = {
  question: Question;
  job: JobApplication;
  round: Round;
};

interface Props {
  jobs: JobApplication[];
  onSelectJob: (jobId: string) => void;
  onGoHome: () => void;
}

function flattenQuestions(jobs: JobApplication[]): QuestionWithContext[] {
  const list: QuestionWithContext[] = [];
  for (const job of jobs) {
    for (const round of job.rounds) {
      for (const q of round.questions) {
        list.push({ question: q, job, round });
      }
    }
  }
  return list;
}

function getAllTags(jobs: JobApplication[]): string[] {
  const set = new Set<string>();
  for (const job of jobs) {
    for (const round of job.rounds) {
      for (const q of round.questions) {
        q.tags.forEach(t => set.add(t));
      }
    }
  }
  return Array.from(set).sort();
}

export function ExperienceView({ jobs, onSelectJob, onGoHome }: Props) {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | 'all'>('all');
  const [filterCompany, setFilterCompany] = useState<string | 'all'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allItems = useMemo(() => flattenQuestions(jobs), [jobs]);
  const tags = useMemo(() => getAllTags(jobs), [jobs]);
  const companies = useMemo(() => [...new Set(jobs.map(j => j.company))].sort(), [jobs]);
  const departments = useMemo(() =>
    [...new Set(jobs.map(j => j.department).filter((d): d is string => !!d))].sort(),
    [jobs]
  );

  const filtered = useMemo(() => {
    return allItems.filter(({ question, job }) => {
      const matchSearch =
        !search ||
        question.content.toLowerCase().includes(search.toLowerCase()) ||
        question.answer.toLowerCase().includes(search.toLowerCase());
      const matchTag = filterTag === 'all' || question.tags.includes(filterTag);
      const matchCompany = filterCompany === 'all' || job.company === filterCompany;
      const matchDepartment = filterDepartment === 'all' || job.department === filterDepartment;
      return matchSearch && matchTag && matchCompany && matchDepartment;
    });
  }, [allItems, search, filterTag, filterCompany, filterDepartment]);

  return (
    <div className="experience-view">
      <h2 className="experience-title">📚 我的面经</h2>
      <p className="experience-subtitle">汇总所有面试题目，按标签或公司筛选复习</p>

      {allItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>还没有面试题目</h2>
          <p>在「主页」的投递详情里添加面试轮次和题目，这里会自动汇总</p>
          <button className="btn btn-primary" onClick={onGoHome}>
            去主页
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="search-input"
              placeholder="搜索题目或回答…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="filter-row-group">
              <div className="filter-row">
                <label className="filter-label">标签</label>
                <select
                  className="input select-input experience-select"
                  value={filterTag}
                  onChange={e => setFilterTag(e.target.value)}
                >
                  <option value="all">全部</option>
                  {tags.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="filter-row">
                <label className="filter-label">公司</label>
                <select
                  className="input select-input experience-select"
                  value={filterCompany}
                  onChange={e => setFilterCompany(e.target.value)}
                >
                  <option value="all">全部</option>
                  {companies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {departments.length > 0 && (
                <div className="filter-row">
                  <label className="filter-label">部门</label>
                  <select
                    className="input select-input experience-select"
                    value={filterDepartment}
                    onChange={e => setFilterDepartment(e.target.value)}
                  >
                    <option value="all">全部</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="no-result">没有匹配的题目，试试调整筛选条件</div>
          ) : (
            <div className="experience-list">
              {filtered.map(({ question, job, round }) => {
                const id = question.id;
                const isExpanded = expandedId === id;
                return (
                  <div
                    key={`${job.id}-${round.id}-${id}`}
                    className="experience-card"
                  >
                    <div
                      className="experience-card-header"
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                    >
                      <span className="experience-card-chevron">{isExpanded ? '▲' : '▼'}</span>
                      <span className="experience-card-content-preview">
                        {question.content.slice(0, 80)}
                        {question.content.length > 80 ? '…' : ''}
                      </span>
                    </div>
                    <div className="experience-card-meta">
                      <span className="meta-chip">{job.company} · {round.name || '面试'}</span>
                      {question.tags.length > 0 && (
                        <span className="tag-row">
                          {question.tags.map(t => (
                            <span key={t} className="tag tag-sm">{t}</span>
                          ))}
                        </span>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="experience-card-body">
                        <div className="form-section">
                          <h3 className="section-label">题目</h3>
                          <p className="experience-card-full-content">{question.content}</p>
                        </div>
                        {question.answer && (
                          <div className="form-section">
                            <h3 className="section-label">我的回答 / 思路</h3>
                            <p className="experience-card-answer">{question.answer}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectJob(job.id)}
                        >
                          查看完整投递
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
