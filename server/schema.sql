-- ============================================
-- 面试本数据库表结构
-- 数据库: interview_tracker
-- 字符集: utf8mb4
-- ============================================

-- 1. 用户表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 投递记录表
DROP TABLE IF EXISTS `job_applications`;
CREATE TABLE `job_applications` (
  `id` VARCHAR(36) NOT NULL COMMENT '投递记录ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `company` VARCHAR(255) NOT NULL COMMENT '公司名称',
  `position` VARCHAR(255) NOT NULL COMMENT '应聘岗位',
  `department` VARCHAR(100) DEFAULT '' COMMENT '部门',
  `salary` VARCHAR(100) DEFAULT '' COMMENT '薪资范围',
  `tags` JSON DEFAULT NULL COMMENT '标签（JSON数组）',
  `notes` TEXT DEFAULT NULL COMMENT '整体备注',
  `status` ENUM('active','offer','closed') NOT NULL DEFAULT 'active' COMMENT '状态：进行中/Offer/已结束',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_job_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投递记录表';

-- 若表已存在且无 department 列，请执行:
-- ALTER TABLE job_applications ADD COLUMN department VARCHAR(100) DEFAULT '' COMMENT '部门' AFTER position;

-- 3. 面试轮次表
DROP TABLE IF EXISTS `rounds`;
CREATE TABLE `rounds` (
  `id` VARCHAR(36) NOT NULL COMMENT '轮次ID',
  `job_id` VARCHAR(36) NOT NULL COMMENT '投递记录ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `name` VARCHAR(100) DEFAULT '' COMMENT '轮次名称（如：一面、HR面）',
  `date` VARCHAR(20) DEFAULT '' COMMENT '面试日期（YYYY-MM-DD）',
  `time` VARCHAR(20) DEFAULT '' COMMENT '面试时间（HH:mm）',
  `status` ENUM('pending','passed','failed','offer','ghost') NOT NULL DEFAULT 'pending' COMMENT '状态：待结果/通过/挂掉/Offer/已鬼',
  `location` VARCHAR(255) DEFAULT '' COMMENT '面试地点/方式',
  `interviewer` VARCHAR(100) DEFAULT '' COMMENT '面试官',
  `notes` TEXT DEFAULT NULL COMMENT '本轮备注',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_round_job` FOREIGN KEY (`job_id`) REFERENCES `job_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_round_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面试轮次表';

-- 4. 面试题目表
DROP TABLE IF EXISTS `questions`;
CREATE TABLE `questions` (
  `id` VARCHAR(36) NOT NULL COMMENT '题目ID',
  `round_id` VARCHAR(36) NOT NULL COMMENT '轮次ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `content` TEXT NOT NULL COMMENT '题目内容',
  `answer` TEXT DEFAULT NULL COMMENT '我的回答/解题思路',
  `tags` JSON DEFAULT NULL COMMENT '标签（JSON数组）',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_round_id` (`round_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_question_round` FOREIGN KEY (`round_id`) REFERENCES `rounds` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_question_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面试题目表';

-- 5. 验证码表（临时存储，5分钟过期）
DROP TABLE IF EXISTS `verification_codes`;
CREATE TABLE `verification_codes` (
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `code` VARCHAR(6) NOT NULL COMMENT '验证码',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`phone`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证码表';

-- ============================================
-- 触发器：自动生成 UUID
-- ============================================

DELIMITER $$

-- users 表触发器
DROP TRIGGER IF EXISTS `before_insert_users`$$
CREATE TRIGGER `before_insert_users`
BEFORE INSERT ON `users`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END$$

-- job_applications 表触发器
DROP TRIGGER IF EXISTS `before_insert_job_applications`$$
CREATE TRIGGER `before_insert_job_applications`
BEFORE INSERT ON `job_applications`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END$$

-- rounds 表触发器
DROP TRIGGER IF EXISTS `before_insert_rounds`$$
CREATE TRIGGER `before_insert_rounds`
BEFORE INSERT ON `rounds`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END$$

-- questions 表触发器
DROP TRIGGER IF EXISTS `before_insert_questions`$$
CREATE TRIGGER `before_insert_questions`
BEFORE INSERT ON `questions`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END$$

DELIMITER ;

-- ============================================
-- 定时任务：清理过期验证码（可选）
-- ============================================

-- 开启事件调度器
-- SET GLOBAL event_scheduler = ON;

-- 创建定时清理任务
DROP EVENT IF EXISTS `cleanup_expired_codes`;
CREATE EVENT `cleanup_expired_codes`
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM `verification_codes` 
  WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 5 MINUTE);

-- ============================================
-- 初始化完成
-- ============================================
