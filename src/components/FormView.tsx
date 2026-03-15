import { useState } from 'react';
import type { JobApplication, Round, RoundStatus, Question } from '../types';
import { ROUND_STATUS_LABEL } from '../utils';
import { addRound, updateRound, createJobOnServer, updateJobOnServer, createRoundOnServer, updateRoundOnServer, createQuestionOnServer, updateQuestionOnServer, deleteQuestionOnServer } from '../store';

type Mode =
  | { kind: 'job'; job?: JobApplication }
  | { kind: 'round'; job: JobApplication; round?: Round; didAutoPassPrevious?: boolean };

interface Props {
  mode: Mode;
  onSave: (job: JobApplication) => void;
  onCancel: () => void;
}

const ALL_ROUND_STATUSES: RoundStatus[] = ['pending', 'passed', 'failed', 'offer', 'ghost'];

const POSITION_OPTIONS = [
  '前端开发', '后端开发', '算法工程师', '产品经理', '测试工程师', '数据分析', '运维/DevOps',
  '大模型工程师', 'AI 产品经理', '机器学习工程师', '深度学习工程师', 'NLP 工程师', 'AIGC 方向', '其他',
];
const SALARY_OPTIONS = ['面议', '20-30K', '25-35K', '30-40K', '40K+', '其他'];
const COMMON_TAGS = ['算法', '前端', '后端', 'React', '系统设计', '项目', 'HR', '八股'];
// 面试时间：每半小时一档
const TIME_OPTIONS_30MIN = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

function resolveSelectValue(opts: string[], current: string): { select: string; custom: string } {
  const v = (current || '').trim();
  if (!v) return { select: '', custom: '' };
  if (opts.includes(v)) return { select: v, custom: '' };
  return { select: '其他', custom: v };
}

export function FormView({ mode, onSave, onCancel }: Props) {
  return mode.kind === 'job'
    ? <JobForm job={mode.job} onSave={onSave} onCancel={onCancel} />
    : <RoundForm job={mode.job} round={mode.round} onSave={onSave} onCancel={onCancel} didAutoPassPrevious={mode.didAutoPassPrevious} />;
}

// ─── JobForm ───────────────────────────────────────────
function JobForm({
  job, onSave, onCancel,
}: { job?: JobApplication; onSave: (j: JobApplication) => void; onCancel: () => void }) {
  const positionRes = resolveSelectValue(POSITION_OPTIONS, job?.position ?? '');
  const salaryRes = resolveSelectValue(SALARY_OPTIONS, job?.salary ?? '');

  const [form, setForm] = useState({
    company: job?.company ?? '',
    position: job?.position ?? '',
    positionSelect: positionRes.select,
    positionCustom: positionRes.custom,
    department: job?.department ?? '',
    salary: job?.salary ?? '',
    salarySelect: salaryRes.select,
    salaryCustom: salaryRes.custom,
    tagChips: job?.tags ? job.tags.filter(t => COMMON_TAGS.includes(t)) : [],
    tagsCustom: job?.tags ? job.tags.filter(t => !COMMON_TAGS.includes(t)).join(', ') : '',
    notes: job?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setPosition(select: string, custom: string) {
    const value = select === '其他' ? custom : select;
    setForm(p => ({ ...p, positionSelect: select, positionCustom: custom, position: value }));
  }
  function setSalary(select: string, custom: string) {
    const value = select === '其他' ? custom : select;
    setForm(p => ({ ...p, salarySelect: select, salaryCustom: custom, salary: value }));
  }
  const tagsArr = [...form.tagChips, ...form.tagsCustom.split(',').map(t => t.trim()).filter(Boolean)];

  async function handleSubmit() {
    const positionVal = form.positionSelect === '其他' ? form.positionCustom : form.positionSelect;
    const salaryVal = form.salarySelect === '其他' ? form.salaryCustom : form.salarySelect;
    if (!form.company.trim()) { setErrors({ company: '请填写公司名称' }); return; }
    if (!positionVal.trim()) { setErrors({ position: '请选择或填写岗位名称' }); return; }
    setSubmitError(null);
    setSaving(true);
    const payload = {
      company: form.company.trim(),
      position: positionVal.trim(),
      department: form.department.trim(),
      salary: salaryVal.trim(),
      tags: tagsArr,
      notes: form.notes,
    };
    try {
      if (job) {
        const updated = await updateJobOnServer({ ...job, ...payload, updatedAt: Date.now() });
        onSave(updated);
      } else {
        const created = await createJobOnServer(payload);
        onSave(created);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSaving(false);
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
            <input
              className={`input ${errors.company ? 'error' : ''}`}
              placeholder="请输入公司名称"
              value={form.company}
              onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
            />
            {errors.company && <span className="error-msg">{errors.company}</span>}
          </div>
          <div className="form-field">
            <label>应聘岗位 <span className="required">*</span></label>
            <select
              className="input select-input"
              value={form.positionSelect}
              onChange={e => setPosition(e.target.value, form.positionCustom)}
            >
              <option value="">请选择</option>
              {POSITION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {form.positionSelect === '其他' && (
              <input
                className={`input ${errors.position ? 'error' : ''}`}
                placeholder="请输入岗位名称"
                value={form.positionCustom}
                onChange={e => setPosition('其他', e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
            {errors.position && <span className="error-msg">{errors.position}</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>部门</label>
            <input
              className="input"
              placeholder="e.g. 淘天、国际化电商等"
              value={form.department}
              onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>薪资范围</label>
            <select
              className="input select-input"
              value={form.salarySelect}
              onChange={e => setSalary(e.target.value, form.salaryCustom)}
            >
              <option value="">请选择</option>
              {SALARY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {form.salarySelect === '其他' && (
              <input
                className="input"
                placeholder="e.g. 25K-35K"
                value={form.salaryCustom}
                onChange={e => setSalary('其他', e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        </div>
        <div className="form-field">
          <label>标签</label>
          <div className="tag-chips-row">
            {COMMON_TAGS.map(t => (
              <button
                key={t}
                type="button"
                className={`chip ${form.tagChips.includes(t) ? 'chip-active' : ''}`}
                onClick={() => setForm(p => ({
                  ...p,
                  tagChips: p.tagChips.includes(t) ? p.tagChips.filter(x => x !== t) : [...p.tagChips, t],
                }))}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="其他标签（逗号分隔）"
            value={form.tagsCustom}
            onChange={e => setForm(p => ({ ...p, tagsCustom: e.target.value }))}
            style={{ marginTop: 8 }}
          />
        </div>
      </div>
      <div className="form-section">
        <h3 className="section-label">整体想法 / 备注</h3>
        <textarea className="textarea" placeholder="记录对这家公司的整体感受、薪资期望…" rows={4} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      </div>
      {submitError && <div className="error-msg" style={{ marginBottom: 8 }}>{submitError}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>取消</button>
        <button className="btn btn-primary" onClick={() => handleSubmit()} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}

const ROUND_NAME_OPTIONS = ['一面', '二面', '三面', '技术面', 'HR面', '交叉面', '其他'];
const LOCATION_OPTIONS = ['视频面试', '现场面试', '电话面试', '其他'];

// 轮次内题目草稿（id 表示已存在题目，无 id 表示新增）
type QuestionDraft = { id?: string; content: string; answer: string; tags: string };

// ─── RoundForm ─────────────────────────────────────────
function RoundForm({
  job, round, onSave, onCancel, didAutoPassPrevious,
}: { job: JobApplication; round?: Round; onSave: (j: JobApplication) => void; onCancel: () => void; didAutoPassPrevious?: boolean }) {
  const nameRes = resolveSelectValue(ROUND_NAME_OPTIONS, round?.name ?? '');
  const locRes = resolveSelectValue(LOCATION_OPTIONS, round?.location ?? '');
  const initialTime = round?.time && TIME_OPTIONS_30MIN.includes(round.time) ? round.time : '';

  const [form, setForm] = useState({
    name: round?.name ?? '',
    nameSelect: nameRes.select,
    nameCustom: nameRes.custom,
    date: round?.date ?? new Date().toISOString().slice(0, 10),
    time: initialTime,
    status: (round?.status ?? 'pending') as RoundStatus,
    location: round?.location ?? '',
    locationSelect: locRes.select,
    locationCustom: locRes.custom,
    notes: round?.notes ?? '',
  });
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>(() =>
    round?.questions?.length
      ? round.questions.map(q => ({ id: q.id, content: q.content, answer: q.answer, tags: q.tags.join(', ') }))
      : []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.date) e.date = '请选择面试日期';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitError(null);
    setSaving(true);
    const nameVal = form.nameSelect === '其他' ? form.nameCustom : form.nameSelect;
    const locationVal = form.locationSelect === '其他' ? form.locationCustom : form.locationSelect;
    const payload = { name: nameVal, date: form.date, time: form.time, status: form.status, location: locationVal, interviewer: '', notes: form.notes };
    try {
      let savedRound: Round;
      if (round) {
        const updated = await updateRoundOnServer(job.id, { ...round, ...payload });
        savedRound = updated;
      } else {
        savedRound = await createRoundOnServer(job.id, payload);
      }
      const roundId = savedRound.id;
      const existingById = new Map((round?.questions ?? []).map(q => [q.id, q]));
      const newQuestions: Question[] = [];

      for (const d of questionDrafts) {
        const tags = d.tags.split(',').map(t => t.trim()).filter(Boolean);
        if (d.id && existingById.has(d.id)) {
          await updateQuestionOnServer(roundId, { id: d.id, content: d.content, answer: d.answer, tags, createdAt: existingById.get(d.id)!.createdAt });
          newQuestions.push({ ...existingById.get(d.id)!, content: d.content, answer: d.answer, tags });
        } else if (d.content.trim()) {
          const q = await createQuestionOnServer(roundId, { content: d.content, answer: d.answer, tags });
          newQuestions.push(q);
        }
      }
      const toDelete = round?.questions?.filter(q => !questionDrafts.some(d => d.id === q.id)) ?? [];
      for (const q of toDelete) {
        await deleteQuestionOnServer(roundId, q.id);
      }

      const finalRound: Round = { ...savedRound, questions: newQuestions };
      const jobWithRound = round ? updateRound(job, finalRound) : addRound(job, finalRound);
      onSave(jobWithRound);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  function addQuestionDraft() {
    setQuestionDrafts(p => [...p, { content: '', answer: '', tags: '' }]);
  }
  function updateQuestionDraft(idx: number, patch: Partial<QuestionDraft>) {
    setQuestionDrafts(p => p.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function removeQuestionDraft(idx: number) {
    setQuestionDrafts(p => p.filter((_, i) => i !== idx));
  }

  return (
    <div className="form-view">
      <h2 className="form-title">
        {round ? '编辑轮次' : '新增面试轮次'}
        <span className="form-subtitle"> {job.company} · {job.position}</span>
      </h2>
      {didAutoPassPrevious && (
        <div className="round-form-tip">
          已自动将上一轮次面试结果置为「已通过」
        </div>
      )}
      <div className="form-section">
        <h3 className="section-label">轮次信息</h3>
        <div className="form-row">
          <div className="form-field">
            <label>轮次名称</label>
            <select className="input select-input" value={form.nameSelect} onChange={e => setForm(p => { const v = e.target.value; return { ...p, nameSelect: v, name: v === '其他' ? p.nameCustom : v }; })}>
              <option value="">请选择</option>
              {ROUND_NAME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {form.nameSelect === '其他' && (
              <input className="input" placeholder="请输入轮次名称" value={form.nameCustom} onChange={e => setForm(p => ({ ...p, nameCustom: e.target.value, name: e.target.value }))} style={{ marginTop: 8 }} />
            )}
          </div>
          <div className="form-field">
            <label>面试时间</label>
            <select className="input select-input" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}>
              <option value="">请选择</option>
              {TIME_OPTIONS_30MIN.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>面试日期 <span className="required">*</span></label>
            <input type="date" className={errors.date ? 'input error' : 'input'} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            {errors.date && <span className="error-msg">{errors.date}</span>}
          </div>
          <div className="form-field">
            <label>地点/方式</label>
            <select className="input select-input" value={form.locationSelect} onChange={e => setForm(p => { const v = e.target.value; return { ...p, locationSelect: v, location: v === '其他' ? p.locationCustom : v }; })}>
              <option value="">请选择</option>
              {LOCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {form.locationSelect === '其他' && (
              <input className="input" placeholder="e.g. 北京朝阳区" value={form.locationCustom} onChange={e => setForm(p => ({ ...p, locationCustom: e.target.value, location: e.target.value }))} style={{ marginTop: 8 }} />
            )}
          </div>
        </div>
        <div className="form-field">
          <label>面试状态</label>
          <div className="status-selector">
            {ALL_ROUND_STATUSES.map(s => (
              <button key={s} type="button" className={`status-opt ${form.status === s ? 'status-opt-active' : ''}`} data-status={s} onClick={() => setForm(p => ({ ...p, status: s }))}>{ROUND_STATUS_LABEL[s]}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="form-section">
        <h3 className="section-label">面试题目</h3>
        <p className="form-hint">可在本页直接添加/编辑题目，减少跳转</p>
        {questionDrafts.map((qd, idx) => (
          <div key={qd.id ?? `new-${idx}`} className="round-q-draft">
            <div className="round-q-draft-header">
              <span className="round-q-draft-title">题目 {idx + 1}</span>
              <button type="button" className="btn-link btn-link-danger" onClick={() => removeQuestionDraft(idx)}>删除</button>
            </div>
            <div className="form-field">
              <label>题目内容</label>
              <textarea className="textarea" rows={2} placeholder="面试题目…" value={qd.content} onChange={e => updateQuestionDraft(idx, { content: e.target.value })} />
            </div>
            <div className="form-field">
              <label>回答/思路</label>
              <textarea className="textarea" rows={2} placeholder="可选" value={qd.answer} onChange={e => updateQuestionDraft(idx, { answer: e.target.value })} />
            </div>
            <div className="form-field">
              <label>标签（逗号分隔）</label>
              <input className="input" placeholder="e.g. 算法, React" value={qd.tags} onChange={e => updateQuestionDraft(idx, { tags: e.target.value })} />
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={addQuestionDraft}>+ 添加题目</button>
      </div>
      <div className="form-section">
        <h3 className="section-label">本轮备注</h3>
        <textarea className="textarea" placeholder="记录本轮面试感受、反思、待改进点…" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      </div>
      {submitError && <div className="error-msg" style={{ marginBottom: 8 }}>{submitError}</div>}
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>取消</button>
        <button className="btn btn-primary" onClick={() => handleSubmit()} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}

