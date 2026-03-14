export type RoundStatus = 'pending' | 'passed' | 'failed' | 'offer' | 'ghost';

export type JobStatus = 'active' | 'offer' | 'closed';

export type Question = {
  id: string;
  content: string;
  answer: string;
  tags: string[];
  createdAt: number;
};

// 单次面试轮次
export type Round = {
  id: string;
  name: string;       // e.g. 一面、HR面
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  status: RoundStatus;
  location: string;
  interviewer: string;
  questions: Question[];
  notes: string;      // 本轮备注
  createdAt: number;
  updatedAt: number;
};

// 公司+岗位维度的顶层记录
export type JobApplication = {
  id: string;
  company: string;
  position: string;
  salary: string;
  tags: string[];
  notes: string;      // 整体想法/备注
  status: JobStatus;  // 整体进展
  rounds: Round[];    // 各轮面试
  createdAt: number;
  updatedAt: number;
};
