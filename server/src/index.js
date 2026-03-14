require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const authRouter = require('./routes/auth');
const jobsRouter = require('./routes/jobs');
const questionsRouter = require('./routes/questions');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    // 生产环境加你的域名
    // 'https://yourdomain.com',
  ],
  credentials: true,
}));
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 路由
app.use('/auth', authRouter);                        // 不需要登录
app.use('/jobs', authMiddleware, jobsRouter);         // 需要登录
app.use('/rounds', authMiddleware, questionsRouter);  // 需要登录

// 全局错误处理
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 面试本后端已启动`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   模式: ${process.env.DEV_MODE === 'true' ? '开发（验证码固定 123456）' : '生产'}\n`);
});
