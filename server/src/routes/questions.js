const express = require('express');
const router = express.Router();
const db = require('../db');

// 新增题目
router.post('/:roundId/questions', async (req, res) => {
  const userId = req.userId;
  const { roundId } = req.params;
  const { content, answer = '', tags = [] } = req.body;
  if (!content) return res.status(400).json({ message: '题目内容不能为空' });
  const { rows } = await db.query(
    'INSERT INTO questions (round_id, user_id, content, answer, tags) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [roundId, userId, content, answer, tags]
  );
  res.status(201).json(rows[0]);
});

// 更新题目
router.put('/:roundId/questions/:qId', async (req, res) => {
  const userId = req.userId;
  const { qId } = req.params;
  const { content, answer, tags } = req.body;
  const { rows } = await db.query(
    `UPDATE questions SET
      content = COALESCE($1, content),
      answer  = COALESCE($2, answer),
      tags    = COALESCE($3, tags)
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [content, answer, tags, qId, userId]
  );
  if (rows.length === 0) return res.status(404).json({ message: '题目不存在' });
  res.json(rows[0]);
});

// 删除题目
router.delete('/:roundId/questions/:qId', async (req, res) => {
  const userId = req.userId;
  await db.query('DELETE FROM questions WHERE id=$1 AND user_id=$2', [req.params.qId, userId]);
  res.json({ message: 'ok' });
});

module.exports = router;
