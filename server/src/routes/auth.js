const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

const DEV_MODE = process.env.DEV_MODE === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// 发送验证码
router.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ message: '手机号格式不正确' });
  }

  // 生成6位验证码
  const code = DEV_MODE ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟

  // 清除旧验证码
  await db.query('DELETE FROM sms_codes WHERE phone = $1', [phone]);
  // 存储新验证码
  await db.query(
    'INSERT INTO sms_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
    [phone, code, expiresAt]
  );

  if (!DEV_MODE) {
    // TODO: 接入腾讯云短信 SDK 发送真实短信
    // const tencentSms = require('./sms');
    // await tencentSms.send(phone, code);
    console.log(`[SMS] ${phone} -> ${code}`);
  } else {
    console.log(`[DEV] 验证码: ${code}（开发模式，固定为 123456）`);
  }

  res.json({ message: '验证码已发送' });
});

// 验证验证码并登录
router.post('/verify-code', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ message: '参数缺失' });
  }

  // 查找有效验证码
  const { rows } = await db.query(
    'SELECT * FROM sms_codes WHERE phone = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [phone, code]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: '验证码错误或已过期' });
  }

  // 标记验证码已使用
  await db.query('UPDATE sms_codes SET used = TRUE WHERE id = $1', [rows[0].id]);

  // 查找或创建用户
  let user;
  const existing = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
  if (existing.rows.length > 0) {
    user = existing.rows[0];
  } else {
    const created = await db.query(
      'INSERT INTO users (phone) VALUES ($1) RETURNING *',
      [phone]
    );
    user = created.rows[0];
  }

  // 生成 JWT
  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: { id: user.id, phone: user.phone },
  });
});

module.exports = router;
