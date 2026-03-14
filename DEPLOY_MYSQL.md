# 面试本 - MySQL 部署指南

## 一、本地开发环境（macOS）

### 1. 安装 MySQL

```bash
# 使用 Homebrew 安装
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 首次运行安全配置（设置 root 密码）
mysql_secure_installation
```

### 2. 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE interview_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 退出
exit;
```

### 3. 导入表结构

```bash
cd ~/interview-tracker/server
mysql -u root -p interview_tracker < schema.sql
```

### 4. 配置后端

```bash
# 编辑 .env 文件
vi .env
```

修改数据库配置：
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=interview_tracker
DB_USER=root
DB_PASSWORD=你的MySQL密码

NODE_ENV=development
```

### 5. 安装依赖并启动

```bash
cd ~/interview-tracker/server
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 二、云服务器部署（CentOS/Ubuntu）

### 1. 安装 MySQL 8.0

**CentOS 7/8:**
```bash
# 添加 MySQL 官方源
sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm

# 安装 MySQL
sudo yum install -y mysql-server

# 启动服务
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取临时密码
sudo grep 'temporary password' /var/log/mysqld.log

# 修改 root 密码
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
FLUSH PRIVILEGES;
exit;
```

**Ubuntu 20.04+:**
```bash
sudo apt update
sudo apt install -y mysql-server

# 启动服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

### 2. 创建数据库和用户

```bash
mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE interview_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（推荐）
CREATE USER 'interview_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON interview_tracker.* TO 'interview_user'@'localhost';
FLUSH PRIVILEGES;

exit;
```

### 3. 导入表结构

```bash
mysql -u interview_user -p interview_tracker < /path/to/server/schema.sql
```

### 4. 配置防火墙（如果需要远程连接）

```bash
# CentOS
sudo firewall-cmd --add-port=3306/tcp --permanent
sudo firewall-cmd --reload

# Ubuntu
sudo ufw allow 3306/tcp
```

### 5. 后端部署

参考主 `DEPLOY.md` 文档，`.env` 配置改为：

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=interview_tracker
DB_USER=interview_user
DB_PASSWORD=StrongPassword123!

NODE_ENV=production
```

---

## 三、常见问题

### MySQL 连接失败

```bash
# 检查 MySQL 是否运行
sudo systemctl status mysql  # 或 mysqld

# 检查端口
netstat -tuln | grep 3306

# 测试连接
mysql -u root -p -h localhost
```

### 权限问题

```sql
-- 查看用户权限
SHOW GRANTS FOR 'interview_user'@'localhost';

-- 重新授权
GRANT ALL PRIVILEGES ON interview_tracker.* TO 'interview_user'@'localhost';
FLUSH PRIVILEGES;
```

### 字符集问题

```sql
-- 查看数据库字符集
SHOW CREATE DATABASE interview_tracker;

-- 修改为 utf8mb4
ALTER DATABASE interview_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### UUID() 函数不可用

MySQL 8.0+ 原生支持 `UUID()`。如果是旧版本：

```sql
-- 查看版本
SELECT VERSION();

-- 如果 < 8.0，升级 MySQL 或手动生成 UUID
```

---

## 四、性能优化（生产环境）

### 1. 配置文件优化

编辑 `/etc/my.cnf` (CentOS) 或 `/etc/mysql/mysql.conf.d/mysqld.cnf` (Ubuntu):

```ini
[mysqld]
# 基础配置
max_connections = 200
innodb_buffer_pool_size = 1G  # 设置为服务器内存的 50-70%
innodb_log_file_size = 256M

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 慢查询日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

重启 MySQL：
```bash
sudo systemctl restart mysql
```

### 2. 定期清理过期验证码

```sql
-- 创建定时任务
SET GLOBAL event_scheduler = ON;

CREATE EVENT cleanup_expired_codes
ON SCHEDULE EVERY 1 HOUR
DO DELETE FROM verification_codes WHERE created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
```

---

## 五、备份与恢复

### 备份

```bash
# 完整备份
mysqldump -u root -p interview_tracker > backup_$(date +%Y%m%d).sql

# 只备份结构
mysqldump -u root -p --no-data interview_tracker > schema_backup.sql

# 定时备份（crontab）
0 2 * * * mysqldump -u root -pYourPassword interview_tracker > /backup/db_$(date +\%Y\%m\%d).sql
```

### 恢复

```bash
mysql -u root -p interview_tracker < backup_20240315.sql
```

---

## 六、MySQL vs PostgreSQL 对比

| 特性 | MySQL | PostgreSQL |
|------|-------|------------|
| 易用性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 性能（读多） | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 性能（写多） | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 国内生态 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 云服务支持 | 阿里云RDS、腾讯云 | 阿里云、腾讯云 |
| 适合场景 | Web应用、读多写少 | 复杂查询、数据分析 |

**本项目选择 MySQL 的原因**：
- 国内云服务商支持更好
- 运维更简单
- 性能足够（面试日志不是高并发场景）

---

有问题随时问！
