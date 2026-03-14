import { useState } from 'react';
import type { JobApplication, Round, RoundStatus } from '../types';
import { ROUND_STATUS_LABEL } from '../utils';
import { createJob, createRound } from '../store';

type Mode =
  | { kind: 'job'; job?: JobApplication }        // 新增/编辑公司+岗位
  | { kind: 'round'; job: JobApplication; round?: Round }; // 新增/编辑轮次

interface Props {
  mode: Mode;
  onSave: (job: JobApplication) => void;
  onCancel: () => void;
}

const ALL_ROUND_STATUSES: RoundStatus[] = ['pending', 'passed', 'failed', 'offer', 'ghost'];

export function FormView({ mode, onSave, onCancel }: Props) {
  return mode.kind === 'job'
    ? <JobForm job={mode.job} onSave={onSave} onCancel={onCancel} />
    : <RoundForm job={mode.job} round={mode.round} onSave={onSave} onCancel={onCancel} />;
}

// ─── JobForm ───────────────────────────────────────────
function JobForm({
  job, onSave, onCancel,
}: { job?: JobApplication; onSave: (j: JobApplication) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    company:  job?.company  ?? '',
    position: job?.position ?? '',
    salary:   job?.salary   ?? '',
    tags:     job?.tags.join(', ') ?? '',
    notes:    job?.notes    ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function validate() {
    const e: Record<string, string> = {};
    if (!form.company.trim())  e.company  = '请填写公司名称';
    if (!form.position.trim()) e.position = '请填写岗位名称';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (job) {
      onSave({ ...job, ...form, tags: tagsArr, updatedAt: Date.now() });
    } else {
      onSave(createJob({ ...form, tags: tagsArr }));
    }
  }

  return (
    <div className="form-view">
      <h2 className="form-title">{job ? '编辑投递信息' : '新增投递记录'}</h2>
      <div className="form-section">
        <h3 className="section-label">公司 &amp; 岗位</h3>
        <div className="form-row">
          <div className="form-field">
            <label>公司名称 <span className="required">*</span></label>
            <input className={errors.company ? 'input error' : 'input'} placeholder="e.g. 字节跳动" value={form.company} onChange={e => set('company', e.target.value)} />
            {errors.company && <span className="error-msg">{errors.company}</span>}
          </div>
          <div className="form-field">
            <label>应聘岗位 <span className="required">*</span></label>
            <input className={errors.position ? 'input error' : 'input'} placeholder="e.g. 前端工程师" value={form.position} onChange={e => set('position', e.target.value)} />
            {errors.position && <span className="error-msg">{errors.position}</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>薪资范围</label>
            <input className="input" placeholder="e.g. 25K-35K" value={form.salary} onChange={e => set('salary', e.target.value)} />
          </div>
          <div className="form-field">
            <label>标签（逗号分隔）</label>
            <input className="input" placeholder="e.g. 互联网, 大厂" value={form.tags} onChange={e => set('tags', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="form-section">
        <h3 className="section-label">整体想法 / 备注</h3>
        <textarea className="textarea" placeholder="记录对这家公司的整体感受、薪资期望…" rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>取消</button>
        <button className="btn btn-primary" onClick={handleSubmit}>保存</button>
      </div>
    </div>
  );
}

// ─── RoundForm ─────────────────────────────────────────
function RoundForm({
  job, round, onSave, onCancel,
}: { job: JobApplication; round?: Round; onSave: (j: JobApplication) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name:        round?.name        ?? '',
    date:        round?.date        ?? new Date().toISOString().slice(0, 10),
    time:        round?.time        ?? '',
    status:      round?.status      ?? ('pending' as RoundStatus),
    location:    round?.location    ?? '',
    interviewer: round?.interviewer ?? '',
    notes:       round?.notes       ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function validate() {
    const e: Record<string, string> = {};
    if (!form.date) e.date = '请选择面试日期';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (round) {
      const updatedRound: Round = { ...round, ...form, updatedAt: Date.now() };
      onSave({ ...job, rounds: job.rounds.map(r => r.id === round.id ? updatedRound : r), updatedAt: Date.now() });
    } else {
      const newRound = createRound(form);
      onSave({ ...job, rounds: [...job.rounds, newRound], updatedAt: Date.now() });
    }
  }

  return (
    <div className="form-view">
      <h2 className="form-title">
        {round ? '编辑轮次' : '新增面试轮次'}
        <span className="form-subtitle"> {job.company} · {job.position}</span>
      </h2>
      <div className="form-section">
        <h3 className="section-label">轮次信息</h3>
        <div className="form-row">
          <div className="form-field">
            <label>轮次名称</label>
            <input className="input" placeholder="e.g. 一面、技术面、HR面" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-field">
            <label>面试官</label>
            <input className="input" placeholder="面试官姓名/职位" value={form.interviewer} onChange={e => set('interviewer', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>面试日期 <span className="required">*</span></label>
            <input type="date" className={errors.date ? 'input error' : 'input'} value={form.date} onChange={e => set('date', e.target.value)} />
            {errors.date && <span className="error-msg">{errors.date}</span>}
          </div>
          <div className="form-field">
            <label>面试时间</label>
            <input type="time" className="input" value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>地点/方式</label>
            <input className="input" placeholder="e.g. 视频面试 / 北京朝阳区" value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div className="form-field">
            <label>面试状态</label>
            <div className="status-selector">
              {ALL_ROUND_STATUSES.map(s => (
                <button key={s} type="button"
                  className={`status-opt ${form.status === s ? 'status-opt-active' : ''}`}
                  data-status={s}
                  onClick={() => set('status', s)}
                >{ROUND_STATUS_LABEL[s]}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="form-section">
        <h3 className="section-label">本轮备注</h3>
        <textarea className="textarea" placeholder="记录本轮面试感受、反思、待改进点…" rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>取消</button>
        <button className="btn btn-primary" onClick={handleSubmit}>保存</button>
      </div>
    </div>
  );
}
