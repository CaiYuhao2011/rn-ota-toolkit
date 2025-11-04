-- 创建数据库
CREATE DATABASE IF NOT EXISTS ota DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ota;

-- 创建版本表
CREATE TABLE IF NOT EXISTS ota_version (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    app_name VARCHAR(100) NOT NULL COMMENT '应用名称',
    platform VARCHAR(20) NOT NULL COMMENT '平台（android/ios）',
    version VARCHAR(50) NOT NULL COMMENT '版本号',
    update_type VARCHAR(20) NOT NULL COMMENT '更新类型（incremental/full）',
    description TEXT COMMENT '版本描述',
    min_app_version VARCHAR(50) COMMENT '最低应用版本要求',
    bundle_filename VARCHAR(500) NOT NULL COMMENT 'Bundle 文件名',
    bundle_url VARCHAR(500) NOT NULL COMMENT 'Bundle 访问地址',
    file_size BIGINT COMMENT '文件大小（字节）',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志（0-未删除，1-已删除）',
    INDEX idx_app_platform (app_name, platform),
    INDEX idx_version (version),
    INDEX idx_create_time (create_time),
    UNIQUE KEY uk_app_platform_version (app_name, platform, version, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTA版本表';

