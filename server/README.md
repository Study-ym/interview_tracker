# 面试本后端部署指南

## 目录结构
```
server/
├── src/
│   ├── index.js          # 入口
│   ├── db.js             # 数据库连接
│   ├── middleware/
│   │   └── auth.js       # JWT 鉴权中间件
│   └── routes/
│       ├── auth.js       # 登录相关
│       ├── jobs.js       # 投递记录 + 轮次
│       └── questions.js  # 面试题目
├── schema.sql            # 建表语句
├── package.json
└── .env.example          # 环境变量模板
```

---

## 本地开发

```bash
# 1. 安装依赖
cd server
npm install

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env，填入数据库密码等

# 3. 安装 PostgreSQL（Mac）
brew install postgresql@16
brew services start postgresql@16

# 4. 建库建表
psql postgres -c "CREATE DATABASE interview_tracker;"
psql interview_tracker -f schema.sql

# 5. 启动后端（开发模式，验证码固定 123456）
npm run dev
```

---

## 云服务器部署（腾讯云/阿里云）

### 1. 购买服务器
- 腾讯云轻量应用服务器，2核4G，选 Ubuntu 22.04
- 开放端口：22（SSH）、80（HTTP）、443（HTTPS）、3000（API）

### 2. 安装环境
```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# 建数据库
sudo -u postgres psql -c "CREATE DATABASE interview_tracker;"
sudo -u postgres psql -c "CREATE USER app_user WITH PASSWORD 'your_strong_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE interview_tracker TO app_user;"
sudo -u postgres psql interview_tracker -f /path/to/schema.sql

# 安装 PM2（进程守护）
npm install -g pm2
```

### 3. 上传代码并启动
```bash
# 上传 server 目录到服务器
scp -r server/ root@你的IP:/app/server

# 在服务器上
cd /app/server
npm install
cp .env.example .env
nano .env  # 填入生产环境配置

# 启动
pm2 start src/index.js --name interview-server
pm2 save
pm2 startup
```

### 4. 配置 Nginx 反向代理（可选，建议生产使用）
```bash
apt install -y nginx
```

`/etc/nginx/sites-available/interview-api`:
```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5. 前端环境变量
在前端项目根目录创建 `.env.production`：
```
VITE_API_URL=http://你的服务器IP:3000
```

---

## 接入腾讯云短信（生产环境）

1. 登录腾讯云控制台 → 短信 SMS
2. 创建签名 + 模板（模板内容如：「您的验证码为：{1}，5分钟内有效。」）
3. 填入 `.env`：
```
TENCENT_SMS_SECRET_ID=xxx
TENCENT_SMS_SECRET_KEY=xxx
TENCENT_SMS_APP_ID=xxx
TENCENT_SMS_SIGN=你的签名
TENCENT_SMS_TEMPLATE_ID=你的模板ID
DEV_MODE=false
```
4. 取消 `server/src/routes/auth.js` 中短信发送的注释
