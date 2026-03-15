import type { JobApplication, Round, Question } from './types';
import { jobApi, roundApi, questionApi, type JobApplicationDTO } from './api';

// ─── 数据转换：DTO → 前端类型 ───
function dtoToJob(dto: JobApplicationDTO): JobApplication {
  return {
    id: dto.id,
    company: dto.company,
    position: dto.position,
    department: dto.department ?? '',
    salary: dto.salary,
    tags: dto.tags,
    notes: dto.notes,
    status: dto.status as JobApplication['status'],
    rounds: dto.rounds.map(r => ({
      id: r.id,
      name: r.name,
      date: r.date,
      time: r.time,
      status: r.status as Round['status'],
      location: r.location,
      interviewer: r.interviewer,
      notes: r.notes,
      questions: r.questions.map(q => ({
        id: q.id,
        content: q.content,
        answer: q.answer,
        tags: q.tags,
        createdAt: new Date(q.created_at).getTime(),
      })),
      createdAt: new Date(r.created_at).getTime(),
      updatedAt: new Date(r.updated_at).getTime(),
    })),
    createdAt: new Date(dto.created_at).getTime(),
    updatedAt: new Date(dto.updated_at).getTime(),
  };
}

// ─── 加载数据（从后端或 localStorage 降级）───
export function loadJobs(): JobApplication[] {
  try {
    const raw = localStorage.getItem('interview_tracker_v2');
    const list: JobApplication[] = raw ? JSON.parse(raw) : [];
    return list.map(j => ({ ...j, department: j.department ?? '' }));
  } catch {
    return [];
  }
}

// ─── 保存到 localStorage（离线缓存）───
export function saveJobs(jobs: JobApplication[]): void {
  localStorage.setItem('interview_tracker_v2', JSON.stringify(jobs));
}

// ─── 从后端同步数据 ───
export async function syncFromServer(): Promise<JobApplication[]> {
  try {
    const dtos = await jobApi.list();
    const jobs = dtos.map(dtoToJob);
    saveJobs(jobs); // 缓存到本地
    return jobs;
  } catch (error) {
    console.error('同步失败，使用本地缓存:', error);
    return loadJobs();
  }
}

// ─── JobApplication CRUD（调用后端）───
export async function createJobOnServer(
  data: Pick<JobApplication, 'company' | 'position' | 'department' | 'salary' | 'tags' | 'notes'>
): Promise<JobApplication> {
  const dto = await jobApi.create({
    company: data.company,
    position: data.position,
    department: data.department ?? '',
    salary: data.salary,
    tags: data.tags,
    notes: data.notes,
    status: 'active',
    rounds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return dtoToJob(dto);
}

export async function updateJobOnServer(job: JobApplication): Promise<JobApplication> {
  const dto = await jobApi.update(job.id, {
    company: job.company,
    position: job.position,
    department: job.department ?? '',
    salary: job.salary,
    tags: job.tags,
    notes: job.notes,
    status: job.status,
  });
  // PUT /jobs 不返回 rounds，用当前 job 的 rounds 合并
  const base = dtoToJob({ ...dto, rounds: dto.rounds ?? [] });
  return { ...base, rounds: job.rounds };
}

export async function deleteJobOnServer(id: string): Promise<void> {
  await jobApi.remove(id);
}

// ─── Round CRUD（调用后端）───
export async function createRoundOnServer(
  jobId: string,
  data: Pick<Round, 'name' | 'date' | 'time' | 'status' | 'location' | 'interviewer' | 'notes'>
): Promise<Round> {
  const dto = await roundApi.create(jobId, data);
  return {
    id: dto.id,
    name: dto.name,
    date: dto.date,
    time: dto.time,
    status: dto.status as Round['status'],
    location: dto.location,
    interviewer: dto.interviewer,
    notes: dto.notes,
    questions: [],
    createdAt: new Date(dto.created_at).getTime(),
    updatedAt: new Date(dto.updated_at).getTime(),
  };
}

export async function updateRoundOnServer(jobId: string, round: Round): Promise<Round> {
  const dto = await roundApi.update(jobId, round.id, {
    name: round.name,
    date: round.date,
    time: round.time,
    status: round.status,
    location: round.location,
    interviewer: round.interviewer,
    notes: round.notes,
  });
  return {
    ...round,
    updatedAt: new Date(dto.updated_at).getTime(),
  };
}

export async function deleteRoundOnServer(jobId: string, roundId: string): Promise<void> {
  await roundApi.remove(jobId, roundId);
}

// ─── Question CRUD（调用后端）───
export async function createQuestionOnServer(
  roundId: string,
  data: Pick<Question, 'content' | 'answer' | 'tags'>
): Promise<Question> {
  const dto = await questionApi.create(roundId, data);
  return {
    id: dto.id,
    content: dto.content,
    answer: dto.answer,
    tags: dto.tags,
    createdAt: new Date(dto.created_at).getTime(),
  };
}

export async function updateQuestionOnServer(roundId: string, question: Question): Promise<Question> {
  const dto = await questionApi.update(roundId, question.id, {
    content: question.content,
    answer: question.answer,
    tags: question.tags,
  });
  return question;
}

export async function deleteQuestionOnServer(roundId: string, questionId: string): Promise<void> {
  await questionApi.remove(roundId, questionId);
}

// ─── 本地操作（保持原有逻辑，用于离线模式）───
function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createJob(
  data: Pick<JobApplication, 'company' | 'position' | 'department' | 'salary' | 'tags' | 'notes'>
): JobApplication {
  const now = Date.now();
  return {
    ...data,
    department: data.department ?? '',
    id: uid('job'),
    status: 'active',
    rounds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateJob(jobs: JobApplication[], updated: JobApplication): JobApplication[] {
  return jobs.map(j => j.id === updated.id ? { ...updated, updatedAt: Date.now() } : j);
}

export function deleteJob(jobs: JobApplication[], id: string): JobApplication[] {
  return jobs.filter(j => j.id !== id);
}

export function createRound(
  data: Pick<Round, 'name' | 'date' | 'time' | 'status' | 'location' | 'interviewer' | 'notes'>
): Round {
  const now = Date.now();
  return {
    ...data,
    id: uid('round'),
    questions: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addRound(job: JobApplication, round: Round): JobApplication {
  const rounds = [...job.rounds, round];
  const status = deriveJobStatus(rounds);
  return { ...job, rounds, status, updatedAt: Date.now() };
}

export function updateRound(job: JobApplication, updated: Round): JobApplication {
  const rounds = job.rounds.map(r => r.id === updated.id ? { ...updated, updatedAt: Date.now() } : r);
  const status = deriveJobStatus(rounds);
  return { ...job, rounds, status, updatedAt: Date.now() };
}

export function deleteRound(job: JobApplication, roundId: string): JobApplication {
  const rounds = job.rounds.filter(r => r.id !== roundId);
  const status = deriveJobStatus(rounds);
  return { ...job, rounds, status, updatedAt: Date.now() };
}

function deriveJobStatus(rounds: Round[]): JobApplication['status'] {
  if (rounds.some(r => r.status === 'offer')) return 'offer';
  if (rounds.some(r => r.status === 'failed')) return 'closed';
  return 'active';
}

export function createQuestion(content: string, answer = '', tags: string[] = []): Question {
  return {
    id: uid('q'),
    content,
    answer,
    tags,
    createdAt: Date.now(),
  };
}

export function addQuestion(round: Round, question: Question): Round {
  return { ...round, questions: [...round.questions, question], updatedAt: Date.now() };
}

export function updateQuestion(round: Round, updated: Question): Round {
  return {
    ...round,
    questions: round.questions.map(q => q.id === updated.id ? updated : q),
    updatedAt: Date.now(),
  };
}

export function deleteQuestion(round: Round, questionId: string): Round {
  return {
    ...round,
    questions: round.questions.filter(q => q.id !== questionId),
    updatedAt: Date.now(),
  };
}
