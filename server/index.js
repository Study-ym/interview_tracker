import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import {
  authMiddleware,
  generateToken,
  generateCode,
  saveVerificationCode,
  verifyCode,
  getOrCreateUser,
  sendSMS,
} from './auth.js';

dotenv.config();

// MySQL JSON 字段可能已自动解析为对象，也可能是字符串，统一处理
function parseJSON(val, fallback = []) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return val;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── 健康检查 ───
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── 认证路由 ───
app.post('/auth/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: '手机号格式错误' });
    }
    
    const code = generateCode();
    await saveVerificationCode(phone, code);
    await sendSMS(phone, code);
    
    res.json({ message: '验证码已发送' });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ message: '发送失败，请稍后重试' });
  }
});

app.post('/auth/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    const isValid = await verifyCode(phone, code);
    if (!isValid) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }
    
    const user = await getOrCreateUser(phone);
    const token = generateToken(user.id);
    
    res.json({ token, user });
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({ message: '验证失败' });
  }
});

// ─── 投递记录 CRUD ───
app.get('/jobs', authMiddleware, async (req, res) => {
  try {
    const [jobs] = await pool.query(
      `SELECT * FROM job_applications WHERE user_id = ? ORDER BY updated_at DESC`,
      [req.userId]
    );
    
    const jobsWithRounds = await Promise.all(jobs.map(async (job) => {
      const [rounds] = await pool.query(
        `SELECT * FROM rounds WHERE job_id = ? ORDER BY created_at ASC`,
        [job.id]
      );
      
      const roundsWithQuestions = await Promise.all(rounds.map(async (round) => {
        const [questions] = await pool.query(
          `SELECT * FROM questions WHERE round_id = ? ORDER BY created_at ASC`,
          [round.id]
        );
        return { 
          ...round, 
          questions: questions.map(q => ({ ...q, tags: parseJSON(q.tags) }))
        };
      }));
      
      return { 
        ...job, 
        tags: parseJSON(job.tags),
        rounds: roundsWithQuestions 
      };
    }));
    
    res.json(jobsWithRounds);
  } catch (error) {
    console.error('获取列表失败:', error);
    res.status(500).json({ message: '获取失败' });
  }
});

app.post('/jobs', authMiddleware, async (req, res) => {
  try {
    const { company, position, department, salary, tags, notes, status } = req.body;
    await pool.query(
      `INSERT INTO job_applications (user_id, company, position, department, salary, tags, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, company, position, department || '', salary || '', JSON.stringify(tags || []), notes || '', status || 'active']
    );
    const [rows] = await pool.query(`SELECT * FROM job_applications WHERE id = (SELECT id FROM job_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1)`, [req.userId]);
    res.json({ ...rows[0], tags: parseJSON(rows[0].tags), rounds: [] });
  } catch (error) {
    console.error('创建失败:', error);
    res.status(500).json({ message: '创建失败' });
  }
});

app.put('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { company, position, department, salary, tags, notes, status } = req.body;
    await pool.query(
      `UPDATE job_applications 
       SET company = ?, position = ?, department = ?, salary = ?, tags = ?, notes = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [company, position, department || '', salary, JSON.stringify(tags), notes, status, id, req.userId]
    );
    const [rows] = await pool.query(`SELECT * FROM job_applications WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: '未找到' });
    res.json({ ...rows[0], tags: parseJSON(rows[0].tags) });
  } catch (error) {
    console.error('更新失败:', error);
    res.status(500).json({ message: '更新失败' });
  }
});

app.delete('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(`DELETE FROM job_applications WHERE id = ? AND user_id = ?`, [req.params.id, req.userId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除失败:', error);
    res.status(500).json({ message: '删除失败' });
  }
});

// ─── 轮次 CRUD ───
app.post('/jobs/:jobId/rounds', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { name, date, time, status, location, interviewer, notes } = req.body;
    await pool.query(
      `INSERT INTO rounds (job_id, user_id, name, date, time, status, location, interviewer, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [jobId, req.userId, name || '', date || '', time || '', status || 'pending', location || '', interviewer || '', notes || '']
    );
    const [rows] = await pool.query(`SELECT * FROM rounds WHERE job_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1`, [jobId, req.userId]);
    res.json({ ...rows[0], questions: [] });
  } catch (error) {
    console.error('创建轮次失败:', error);
    res.status(500).json({ message: '创建失败' });
  }
});

app.put('/jobs/:jobId/rounds/:roundId', authMiddleware, async (req, res) => {
  try {
    const { roundId } = req.params;
    const { name, date, time, status, location, interviewer, notes } = req.body;
    await pool.query(
      `UPDATE rounds 
       SET name = ?, date = ?, time = ?, status = ?, location = ?, interviewer = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [name, date, time, status, location, interviewer, notes, roundId, req.userId]
    );
    const [rows] = await pool.query(`SELECT * FROM rounds WHERE id = ?`, [roundId]);
    if (rows.length === 0) return res.status(404).json({ message: '未找到' });
    res.json(rows[0]);
  } catch (error) {
    console.error('更新轮次失败:', error);
    res.status(500).json({ message: '更新失败' });
  }
});

app.delete('/jobs/:jobId/rounds/:roundId', authMiddleware, async (req, res) => {
  try {
    await pool.query(`DELETE FROM rounds WHERE id = ? AND user_id = ?`, [req.params.roundId, req.userId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除轮次失败:', error);
    res.status(500).json({ message: '删除失败' });
  }
});

// ─── 题目 CRUD ───
app.post('/rounds/:roundId/questions', authMiddleware, async (req, res) => {
  try {
    const { roundId } = req.params;
    const { content, answer, tags } = req.body;
    await pool.query(
      `INSERT INTO questions (round_id, user_id, content, answer, tags) 
       VALUES (?, ?, ?, ?, ?)`,
      [roundId, req.userId, content, answer || '', JSON.stringify(tags || [])]
    );
    const [rows] = await pool.query(`SELECT * FROM questions WHERE round_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1`, [roundId, req.userId]);
    res.json({ ...rows[0], tags: parseJSON(rows[0].tags) });
  } catch (error) {
    console.error('创建题目失败:', error);
    res.status(500).json({ message: '创建失败' });
  }
});

app.put('/rounds/:roundId/questions/:qId', authMiddleware, async (req, res) => {
  try {
    const { qId } = req.params;
    const { content, answer, tags } = req.body;
    await pool.query(
      `UPDATE questions SET content = ?, answer = ?, tags = ? WHERE id = ? AND user_id = ?`,
      [content, answer, JSON.stringify(tags), qId, req.userId]
    );
    const [rows] = await pool.query(`SELECT * FROM questions WHERE id = ?`, [qId]);
    if (rows.length === 0) return res.status(404).json({ message: '未找到' });
    res.json({ ...rows[0], tags: parseJSON(rows[0].tags) });
  } catch (error) {
    console.error('更新题目失败:', error);
    res.status(500).json({ message: '更新失败' });
  }
});

app.delete('/rounds/:roundId/questions/:qId', authMiddleware, async (req, res) => {
  try {
    await pool.query(`DELETE FROM questions WHERE id = ? AND user_id = ?`, [req.params.qId, req.userId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除题目失败:', error);
    res.status(500).json({ message: '删除失败' });
  }
});

// ─── 启动服务 ───
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
