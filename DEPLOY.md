# 面试本 - 部署指南

## 一、服务器准备

### 1. 购买云服务器
- **推荐配置**：2核4G，CentOS 7.6+ 或 Ubuntu 20.04+
- **腾讯云**：轻量应用服务器，约 50-80 元/月
- **阿里云**：ECS 入门级，约 60-100 元/月

### 2. 安装环境

```bash
# 更新系统
sudo yum update -y  # CentOS
# 或
sudo apt update && sudo apt upgrade -y  # Ubuntu

# 安装 Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # CentOS
# 或
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs  # Ubuntu

# 安装 PostgreSQL 14+
sudo yum install -y postgresql-server postgresql-contrib  # CentOS
# 或
sudo apt install -y postgresql postgresql-contrib  # Ubuntu

# 初始化数据库
sudo postgresql-setup initdb  # CentOS
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 安装 Nginx
sudo yum install -y nginx  # CentOS
# 或
sudo apt install -y nginx  # Ubuntu
```

---

## 二、数据库配置

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE interview_tracker;
CREATE USER interview_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE interview_tracker TO interview_user;
\q

# 导入表结构
psql -U interview_user -d interview_tracker -f /path/to/server/schema.sql
```

---

## 三、后端部署

### 1. 上传代码到服务器

```bash
# 在本地打包
cd ~/interview-tracker/server
tar -czf server.tar.gz .

# 上传到服务器（替换 your_server_ip）
scp server.tar.gz root@your_server_ip:/opt/

# 在服务器上解压
ssh root@your_server_ip
cd /opt
mkdir interview-tracker-server
tar -xzf server.tar.gz -C interview-tracker-server
cd interview-tracker-server
```

### 2. 安装依赖并配置

```bash
npm install

# 复制环境变量模板
cp .env.example .env

# 编辑配置（填入真实值）
vi .env
```

`.env` 配置示例：
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_tracker
DB_USER=interview_user
DB_PASSWORD=your_strong_password

JWT_SECRET=生成一个随机字符串（至少32位）

# 腾讯云短信（去腾讯云控制台获取）
TENCENT_SECRET_ID=你的SecretId
TENCENT_SECRET_KEY=你的SecretKey
TENCENT_SMS_APP_ID=你的应用ID
TENCENT_SMS_SIGN=你的签名
TENCENT_SMS_TEMPLATE_ID=你的模板ID

PORT=3000
NODE_ENV=production
```

### 3. 使用 PM2 守护进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start index.js --name interview-api

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs interview-api
```

---

## 四、前端部署

### 1. 本地构建

```bash
cd ~/interview-tracker

# 创建生产环境配置
echo "VITE_API_URL=https://your-domain.com/api" > .env.production

# 构建
npm run build
```

### 2. 上传到服务器

```bash
# 打包 dist 目录
tar -czf dist.tar.gz dist

# 上传
scp dist.tar.gz root@your_server_ip:/var/www/

# 在服务器上解压
ssh root@your_server_ip
cd /var/www
mkdir interview-tracker
tar -xzf dist.tar.gz -C interview-tracker --strip-components=1
```

### 3. 配置 Nginx

```bash
sudo vi /etc/nginx/conf.d/interview-tracker.conf
```

写入以下配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP

    # 前端静态文件
    location / {
        root /var/www/interview-tracker;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 五、腾讯云短信配置

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/smsv2)
2. 开通短信服务
3. 创建签名（如「面试本」）
4. 创建模板（如「您的验证码是{1}，{2}分钟内有效」）
5. 获取 `SecretId`、`SecretKey`、`AppId`、`TemplateId`
6. 填入 `.env` 文件

**费用**：约 0.045 元/条（国内短信）

---

## 六、HTTPS 配置（可选但推荐）

```bash
# 安装 certbot
sudo yum install -y certbot python3-certbot-nginx  # CentOS
# 或
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# 自动配置 SSL
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 七、iOS 打包（Capacitor）

### 1. 安装 Capacitor

```bash
cd ~/interview-tracker
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init
```

按提示填写：
- App name: `面试本`
- App ID: `com.yourcompany.interviewtracker`

### 2. 添加 iOS 平台

```bash
npx cap add ios
```

### 3. 构建并同步

```bash
npm run build
npx cap sync
```

### 4. 用 Xcode 打开

```bash
npx cap open ios
```

在 Xcode 中：
1. 连接 iPhone 或选择模拟器
2. 点击 Run 按钮测试
3. 配置签名（需要 Apple Developer 账号）
4. Archive → Upload to App Store

---

## 八、常见问题

### 数据库连接失败
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查防火墙
sudo firewall-cmd --add-port=5432/tcp --permanent  # CentOS
sudo firewall-cmd --reload
```

### 短信发送失败
- 检查腾讯云账户余额
- 确认签名和模板已审核通过
- 查看后端日志：`pm2 logs interview-api`

### 前端无法访问后端
- 检查 Nginx 配置是否正确
- 确认后端服务运行：`pm2 status`
- 检查防火墙：`sudo firewall-cmd --add-port=80/tcp --permanent`

---

## 九、开发模式测试

不想买服务器？先本地测试：

```bash
# 后端
cd server
cp .env.example .env
# 编辑 .env，设置 NODE_ENV=development（跳过真实短信）
npm install
npm run dev

# 前端（新终端）
cd ..
npm run dev
```

开发模式下，验证码会直接打印在后端控制台，不会真实发送短信。

---

## 十、成本估算

| 项目 | 费用 |
|------|------|
| 云服务器（2核4G） | 50-80 元/月 |
| 域名（可选） | 50-100 元/年 |
| 短信（按量） | 0.045 元/条 |
| Apple Developer | $99/年（约700元） |
| **总计（首年）** | **约 1500-2000 元** |

---

有问题随时问！
