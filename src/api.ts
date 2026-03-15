import { clearAuth } from './auth';

// API 基础配置
// 开发时指向本地后端，生产时改为你的服务器地址
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** 401 时触发，便于 App 统一跳转登录 */
export const AUTH_LOGOUT_EVENT = 'auth:logout';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
    const err = await res.json().catch(() => ({ message: '登录已过期，请重新登录' }));
    throw new Error(err.message ?? '登录已过期，请重新登录');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? '请求失败');
  }
  return res.json();
}

// ─── Auth ───
export const authApi = {
  sendCode: (phone: string) =>
    request<{ message: string }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyCode: (phone: string, code: string) =>
    request<{ token: string; user: { id: string; phone: string } }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
};

// ─── JobApplication ───
export const jobApi = {
  list: () =>
    request<JobApplicationDTO[]>('/jobs'),
  create: (data: Omit<JobApplicationDTO, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<JobApplicationDTO>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<JobApplicationDTO>) =>
    request<JobApplicationDTO>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<void>(`/jobs/${id}`, { method: 'DELETE' }),
};

// ─── Round ───
export const roundApi = {
  create: (jobId: string, data: Omit<RoundDTO, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<RoundDTO>(`/jobs/${jobId}/rounds`, { method: 'POST', body: JSON.stringify(data) }),
  update: (jobId: string, roundId: string, data: Partial<RoundDTO>) =>
    request<RoundDTO>(`/jobs/${jobId}/rounds/${roundId}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (jobId: string, roundId: string) =>
    request<void>(`/jobs/${jobId}/rounds/${roundId}`, { method: 'DELETE' }),
};

// ─── Question ───
export const questionApi = {
  create: (roundId: string, data: Omit<QuestionDTO, 'id' | 'createdAt'>) =>
    request<QuestionDTO>(`/rounds/${roundId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  update: (roundId: string, qId: string, data: Partial<QuestionDTO>) =>
    request<QuestionDTO>(`/rounds/${roundId}/questions/${qId}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (roundId: string, qId: string) =>
    request<void>(`/rounds/${roundId}/questions/${qId}`, { method: 'DELETE' }),
};

// ─── DTOs（与后端数据库字段对应）───
export type QuestionDTO = {
  id: string;
  content: string;
  answer: string;
  tags: string[];
  created_at: string;
};

export type RoundDTO = {
  id: string;
  name: string;
  date: string;
  time: string;
  status: string;
  location: string;
  interviewer: string;
  notes: string;
  questions: QuestionDTO[];
  created_at: string;
  updated_at: string;
};

export type JobApplicationDTO = {
  id: string;
  company: string;
  position: string;
  department: string;
  salary: string;
  tags: string[];
  notes: string;
  status: string;
  rounds: RoundDTO[];
  created_at: string;
  updated_at: string;
};
