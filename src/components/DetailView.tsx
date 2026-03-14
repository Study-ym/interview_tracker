import { useState } from 'react';
import type { JobApplication, Round, Question } from '../types';
import {
  JOB_STATUS_LABEL, JOB_STATUS_COLOR,
  ROUND_STATUS_LABEL, ROUND_STATUS_COLOR,
  formatDate, timeAgo,
} from '../utils';
import {
  createQuestion, addQuestion, updateQuestion, deleteQuestion,
  updateRound, deleteRound,
} from '../store';

interface Props {
  job: JobApplication;
  onChange: (job: JobApplication) => void;
  onEdit: () => void;
  onAddRound: () => void;
  onEditRound: (roundId: string) => void;
  onDelete: () => void;
}

interface QFormState { content: string; answer: string; tags: string; }
const EMPTY_Q: QFormState = { content: '', answer: '', tags: '' };

export function DetailView({ job, onChange, onEdit, onAddRound, onEditRound, onDelete }: Props) {
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(
    job.rounds.length > 0 ? job.rounds[job.rounds.length - 1].id : null
  );
  const [addingQRoundId, setAddingQRoundId] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<{ roundId: string; qId: string } | null>(null);
  const [qForm, setQForm] = useState<QFormState>(EMPTY_Q);
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(job.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteRound, setConfirmDeleteRound] = useState<string | null>(null);

  function saveNotes() {
    onChange({ ...job, notes: notesVal, updatedAt: Date.now() });
    setEditingNotes(false);
  }

  function submitQuestion(round: Round) {
    if (!qForm.content.trim()) return;
    const tags = qForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    let updatedRound: Round;
    if (editingQ) {
      const existing = round.questions.find(q => q.id === editingQ.qId)!;
      updatedRound = updateQuestion(round, { ...existing, content: qForm.content, answer: qForm.answer, tags });
      setEditingQ(null);
    } else {
      const q = createQuestion(qForm.content, qForm.answer, tags);
      updatedRound = addQuestion(round, q);
      setAddingQRoundId(null);
    }
    onChange(updateRound(job, updatedRound));
    setQForm(EMPTY_Q);
  }

  function startEditQ(round: Round, q: Question) {
    setEditingQ({ roundId: round.id, qId: q.id });
    setAddingQRoundId(null);
    setQForm({ content: q.content, answer: q.answer, tags: q.tags.join(', ') });
  }

  function cancelQForm() {
    setAddingQRoundId(null);
    setEditingQ(null);
    setQForm(EMPTY_Q);
  }

  return (
    <div className="detail-view">
      {/* ── Hero ── */}
      <div className="detail-hero">
        <div className="detail-company-row">
          <h1 className="detail-company">{job.company}</h1>
          <span className="status-badge" style={{ background: JOB_STATUS_COLOR[job.status] }}>
            {JOB_STATUS_LABEL[job.status]}
          </span>
        </div>
        <div className="detail-position">{job.position}</div>
        <div className="detail-meta-chips">
          {job.salary && <span className="meta-chip">💰 {job.salary}</span>}
          <span className="meta-chip">🔄 {job.rounds.length} 轮面试</span>
        </div>
        {job.tags.length > 0 && (
          <div className="tag-row">
            {job.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
        <div className="detail-actions">
          <button className="btn btn-outline" onClick={onEdit}>编辑信息</button>
          <button className="btn btn-primary" onClick={onAddRound}>+ 新增轮次</button>
          <button className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>删除</button>
        </div>
        <div className="detail-updated">最后更新 {timeAgo(job.updatedAt)}</div>
      </div>

      {/* ── 整体想法 ── */}
      <section className="detail-section">
        <div className="section-header">
          <h2 className="section-title">💡 整体想法 &amp; 备注</h2>
          {!editingNotes && (
            <button
              className="btn-link"
              onClick={() => { setNotesVal(job.notes); setEditingNotes(true); }}
            >{job.notes ? '编辑' : '+ 添加'}</button>
          )}
        </div>
        {editingNotes ? (
          <div className="notes-edit">
            <textarea
              className="textarea"
              rows={5}
              value={notesVal}
              onChange={e => setNotesVal(e.target.value)}
              placeholder="记录对这家公司的整体感受、薪资谈判要点、是否值得接受 Offer…"
              autoFocus
            />
            <div className="inline-actions">
              <button className="btn btn-ghost" onClick={() => setEditingNotes(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveNotes}>保存</button>
            </div>
          </div>
        ) : (
          <div
            className={`notes-display ${!job.notes ? 'notes-empty' : ''}`}
            onClick={() => { setNotesVal(job.notes); setEditingNotes(true); }}
          >
            {job.notes || '点击添加整体想法和备注…'}
          </div>
        )}
      </section>

      {/* ── 面试轮次时间线 ── */}
      <section className="detail-section">
        <div className="section-header">
          <h2 className="section-title">🗂 面试轮次 <span className="q-count">{job.rounds.length}</span></h2>
          <button className="btn-link" onClick={onAddRound}>+ 新增轮次</button>
        </div>

        {job.rounds.length === 0 ? (
          <div className="q-empty">还没有面试轮次，点击「新增轮次」开始记录</div>
        ) : (
          <div className="rounds-timeline">
            {job.rounds.map((round, idx) => {
              const isExpanded = expandedRoundId === round.id;
              const isAddingQ = addingQRoundId === round.id;
              const isEditingQ = editingQ?.roundId === round.id;
              return (
                <div key={round.id} className={`round-block ${isExpanded ? 'round-block-expanded' : ''}`}>
                  <div
                    className="round-header"
                    onClick={() => setExpandedRoundId(isExpanded ? null : round.id)}
                  >
                    <div className="round-header-left">
                      <span className="round-status-dot" style={{ background: ROUND_STATUS_COLOR[round.status] }} />
                      <span className="round-name">{round.name || `第 ${idx + 1} 轮`}</span>
                      <span
                        className="status-badge"
                        style={{ background: ROUND_STATUS_COLOR[round.status], fontSize: '11px', padding: '2px 8px' }}
                      >{ROUND_STATUS_LABEL[round.status]}</span>
                    </div>
                    <div className="round-header-right">
                      {round.date && <span className="round-date">{formatDate(round.date, round.time)}</span>}
                      <span className="q-chevron">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="round-body">
                      <div className="round-meta-row">
                        {round.interviewer && <span className="meta-chip">👤 {round.interviewer}</span>}
                        {round.location && <span className="meta-chip">📍 {round.location}</span>}
                        <span className="meta-chip">💬 {round.questions.length} 题</span>
                      </div>
                      {round.notes && <div className="round-notes">{round.notes}</div>}
                      <div className="round-actions">
                        <button className="btn-link" onClick={() => onEditRound(round.id)}>编辑轮次</button>
                        <button className="btn-link btn-link-danger" onClick={() => setConfirmDeleteRound(round.id)}>删除轮次</button>
                      </div>

                      <div className="q-section">
                        <div className="q-section-header">
                          <span className="section-title">面试题目 <span className="q-count">{round.questions.length}</span></span>
                          {!isAddingQ && !isEditingQ && (
                            <button className="btn-link" onClick={() => { setAddingQRoundId(round.id); setEditingQ(null); setQForm(EMPTY_Q); }}>+ 添加题目</button>
                          )}
                        </div>

                        {(isAddingQ || isEditingQ) && (
                          <div className="q-form">
                            <div className="form-field">
                              <label>题目内容</label>
                              <textarea className="textarea" rows={3} placeholder="面试题目…" value={qForm.content} onChange={e => setQForm(p => ({ ...p, content: e.target.value }))} autoFocus />
                            </div>
                            <div className="form-field">
                              <label>我的回答 / 解题思路</label>
                              <textarea className="textarea" rows={4} placeholder="写下你的思路、答案或反思…" value={qForm.answer} onChange={e => setQForm(p => ({ ...p, answer: e.target.value }))} />
                            </div>
                            <div className="form-field">
                              <label>标签（逗号分隔）</label>
                              <input className="input" placeholder="e.g. 算法, React, 系统设计" value={qForm.tags} onChange={e => setQForm(p => ({ ...p, tags: e.target.value }))} />
                            </div>
                            <div className="inline-actions">
                              <button className="btn btn-ghost" onClick={cancelQForm}>取消</button>
                              <button className="btn btn-primary" onClick={() => submitQuestion(round)}>{isEditingQ ? '更新' : '添加'}</button>
                            </div>
                          </div>
                        )}

                        {round.questions.length === 0 && !isAddingQ ? (
                          <div className="q-empty">还没有题目记录</div>
                        ) : (
                          <div className="q-list">
                            {round.questions.map((q, qi) => (
                              <div key={q.id} className={`q-item ${expandedQId === q.id ? 'q-item-expanded' : ''}`}>
                                <div className="q-item-header" onClick={() => setExpandedQId(expandedQId === q.id ? null : q.id)}>
                                  <span className="q-index">Q{qi + 1}</span>
                                  <span className="q-content-preview">{q.content}</span>
                                  <span className="q-chevron">{expandedQId === q.id ? '▲' : '▼'}</span>
                                </div>
                                {expandedQId === q.id && (
                                  <div className="q-item-body">
                                    {q.answer && (
                                      <div className="q-answer">
                                        <div className="q-answer-label">我的回答</div>
                                        <p>{q.answer}</p>
                                      </div>
                                    )}
                                    {q.tags.length > 0 && (
                                      <div className="tag-row">
                                        {q.tags.map(t => <span key={t} className="tag tag-sm">{t}</span>)}
                                      </div>
                                    )}
                                    <div className="q-item-actions">
                                      <button className="btn-link" onClick={() => startEditQ(round, q)}>编辑</button>
                                      <button className="btn-link btn-link-danger" onClick={() => onChange(updateRound(job, deleteQuestion(round, q.id)))}>删除</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 删除公司确认 ── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>确认删除？</h3>
            <p>删除「{job.company} - {job.position}」及所有面试日志，无法恢复。</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>取消</button>
              <button className="btn btn-danger" onClick={onDelete}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 删除轮次确认 ── */}
      {confirmDeleteRound && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteRound(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>确认删除该轮次？</h3>
            <p>该轮次的所有题目记录将一并删除，无法恢复。</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteRound(null)}>取消</button>
              <button className="btn btn-danger" onClick={() => { onChange(deleteRound(job, confirmDeleteRound)); setConfirmDeleteRound(null); }}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
