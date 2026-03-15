import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import tencentcloud from 'tencentcloud-sdk-nodejs';

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

// ─── 发送短信验证码（腾讯云或阿里云）───
export async function sendSMS(phone, code) {
  // 开发环境直接打印验证码，不真实发送
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 验证码（开发模式）: ${phone} -> ${code}`);
    return;
  }

  // 使用阿里云短信
  if (process.env.SMS_PROVIDER === 'aliyun') {
    return sendSMSAliyun(phone, code);
  }

  // 默认使用腾讯云短信
  return sendSMSTencent(phone, code);
}

// ─── 腾讯云短信 ───
async function sendSMSTencent(phone, code) {
  const SmsClient = tencentcloud.sms.v20210111.Client;
  const client = new SmsClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY,
    },
    region: 'ap-guangzhou',
  });

  await client.SendSms({
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: process.env.TENCENT_SMS_APP_ID,
    SignName: process.env.TENCENT_SMS_SIGN,
    TemplateId: process.env.TENCENT_SMS_TEMPLATE_ID,
    TemplateParamSet: [code, '5'], // 验证码和有效期（分钟）
  });
}

// ─── 阿里云短信 ───
async function sendSMSAliyun(phone, code) {
  try {
    const Dysmsapi = (await import('@alicloud/dysmsapi20170525')).default;
    const OpenApi = (await import('@alicloud/openapi-client')).default;

    const config = new OpenApi.Config({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    });
    config.endpoint = 'dysmsapi.aliyuncs.com';
    const client = new Dysmsapi(config);

    const SendSmsRequest = (await import('@alicloud/dysmsapi20170525')).SendSmsRequest;
    const req = new SendSmsRequest({
      phoneNumbers: phone,
      signName: process.env.ALIYUN_SMS_SIGN,
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
      templateParam: JSON.stringify({ code }),
    });

    const result = await client.sendSms(req);
    if (result.body.code !== 'OK') {
      throw new Error(`短信发送失败: ${result.body.message}`);
    }
  } catch (error) {
    console.error('阿里云短信发送失败:', error);
    throw error;
  }
}

// ─── 生成 6 位随机验证码 ───
export function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── 内存存储验证码（开发模式临时方案）───
const codeStore = new Map(); // { phone: { code, timestamp } }

// ─── 存储验证码 ───
export async function saveVerificationCode(phone, code) {
  if (process.env.NODE_ENV === 'development') {
    // 开发模式用内存存储
    codeStore.set(phone, { code, timestamp: Date.now() });
    return;
  }
  
  await pool.query(
    `INSERT INTO verification_codes (phone, code, created_at) 
     VALUES (?, ?, NOW()) 
     ON DUPLICATE KEY UPDATE code = ?, created_at = NOW()`,
    [phone, code, code]
  );
}

// ─── 验证验证码 ───
export async function verifyCode(phone, code) {
  if (process.env.NODE_ENV === 'development') {
    // 开发模式从内存读取
    const stored = codeStore.get(phone);
    if (!stored) return false;
    
    const elapsed = Date.now() - stored.timestamp;
    if (elapsed > 5 * 60 * 1000) return false; // 5分钟过期
    if (stored.code !== code) return false;
    
    codeStore.delete(phone);
    return true;
  }
  
  const [rows] = await pool.query(
    `SELECT code, created_at FROM verification_codes WHERE phone = ?`,
    [phone]
  );
  
  if (rows.length === 0) return false;
  
  const { code: savedCode, created_at } = rows[0];
  const elapsed = Date.now() - new Date(created_at).getTime();
  
  // 验证码 5 分钟内有效
  if (elapsed > 5 * 60 * 1000) return false;
  if (savedCode !== code) return false;
  
  // 验证成功后删除验证码
  await pool.query(`DELETE FROM verification_codes WHERE phone = ?`, [phone]);
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
