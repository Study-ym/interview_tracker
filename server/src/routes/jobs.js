const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有投递记录（含轮次和题目）
router.get('/', async (req, res) => {
  const userId = req.userId;
  const { rows: jobs } = await db.query(
    'SELECT * FROM job_applications WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );

  // 批量查询轮次和题目
  for (const job of jobs) {
    const { rows: rounds } = await db.query(
      'SELECT * FROM rounds WHERE job_id = $1 ORDER BY created_at ASC',
      [job.id]
    );
    for (const round of rounds) {
      const { rows: questions } = await db.query(
        'SELECT * FROM questions WHERE round_id = $1 ORDER BY created_at ASC',
        [round.id]
      );
      round.questions = questions;
    }
    job.rounds = rounds;
  }

  res.json(jobs);
});

// 新增投递记录
router.post('/', async (req, res) => {
  const userId = req.userId;
  const { company, position, salary = '', tags = [], notes = '', status = 'active' } = req.body;
  if (!company || !position) {
    return res.status(400).json({ message: '公司和岗位为必填项' });
  }
  const { rows } = await db.query(
    `INSERT INTO job_applications (user_id, company, position, salary, tags, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, company, position, salary, tags, notes, status]
  );
  rows[0].rounds = [];
  res.status(201).json(rows[0]);
});

// 更新投递记录
router.put('/:id', async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { company, position, salary, tags, notes, status } = req.body;
  const { rows } = await db.query(
    `UPDATE job_applications SET
      company = COALESCE($1, company),
      position = COALESCE($2, position),
      salary = COALESCE($3, salary),
      tags = COALESCE($4, tags),
      notes = COALESCE($5, notes),
      status = COALESCE($6, status),
      updated_at = NOW()
     WHERE id = $7 AND user_id = $8 RETURNING *`,
    [company, position, salary, tags, notes, status, id, userId]
  );
  if (rows.length === 0) return res.status(404).json({ message: '记录不存在' });
  res.json(rows[0]);
});

// 删除投递记录
router.delete('/:id', async (req, res) => {
  const userId = req.userId;
  await db.query('DELETE FROM job_applications WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
  res.json({ message: 'ok' });
});

// ─── 轮次 ───
router.post('/:jobId/rounds', async (req, res) => {
  const userId = req.userId;
  const { jobId } = req.params;
  const { name='', date='', time='', status='pending', location='', interviewer='', notes='' } = req.body;
  const { rows } = await db.query(
    `INSERT INTO rounds (job_id, user_id, name, date, time, status, location, interviewer, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [jobId, userId, name, date, time, status, location, interviewer, notes]
  );
  rows[0].questions = [];
  // 更新 job updated_at
  await db.query('UPDATE job_applications SET updated_at=NOW() WHERE id=$1', [jobId]);
  res.status(201).json(rows[0]);
});

router.put('/:jobId/rounds/:roundId', async (req, res) => {
  const userId = req.userId;
  const { roundId, jobId } = req.params;
  const { name, date, time, status, location, interviewer, notes } = req.body;
  const { rows } = await db.query(
    `UPDATE rounds SET
      name = COALESCE($1,name), date = COALESCE($2,date), time = COALESCE($3,time),
      status = COALESCE($4,status), location = COALESCE($5,location),
      interviewer = COALESCE($6,interviewer), notes = COALESCE($7,notes),
      updated_at = NOW()
     WHERE id=$8 AND user_id=$9 RETURNING *`,
    [name, date, time, status, location, interviewer, notes, roundId, userId]
  );
  if (rows.length === 0) return res.status(404).json({ message: '轮次不存在' });
  await db.query('UPDATE job_applications SET updated_at=NOW() WHERE id=$1', [jobId]);
  res.json(rows[0]);
});

router.delete('/:jobId/rounds/:roundId', async (req, res) => {
  const userId = req.userId;
  await db.query('DELETE FROM rounds WHERE id=$1 AND user_id=$2', [req.params.roundId, userId]);
  await db.query('UPDATE job_applications SET updated_at=NOW() WHERE id=$1', [req.params.jobId]);
  res.json({ message: 'ok' });
});

module.exports = router;
