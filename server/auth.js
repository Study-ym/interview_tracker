import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// ─── JWT 工具 ───
export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── 中间件：验证登录 ───
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: '未登录' });
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ message: 'Token 无效或已过期' });
  
  req.userId = payload.userId;
  next();
}

// ─── 生成 6 位随机验证码（开发模式调试用）───
export function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── 内存存储验证码（开发模式调试用）───
const codeStore = new Map();

// ─── 存储验证码（开发模式调试）───
export async function saveVerificationCode(phone, code) {
  codeStore.set(phone, { code, timestamp: Date.now() });
  console.log(`📱 验证码（开发模式调试）: ${phone} -> ${code}`);
}

// ─── 验证验证码（开发模式调试）───
export async function verifyCode(phone, code) {
  const stored = codeStore.get(phone);
  if (!stored) return false;
  
  const elapsed = Date.now() - stored.timestamp;
  if (elapsed > 5 * 60 * 1000) return false;
  if (stored.code !== code) return false;
  
  codeStore.delete(phone);
  return true;
}

// ─── 获取或创建用户 ───
export async function getOrCreateUser(phone) {
  let [rows] = await pool.query(`SELECT id, phone FROM users WHERE phone = ?`, [phone]);
  
  if (rows.length === 0) {
    await pool.query(`INSERT INTO users (phone) VALUES (?)`, [phone]);
    [rows] = await pool.query(`SELECT id, phone FROM users WHERE phone = ?`, [phone]);
  }
  
  return rows[0];
}