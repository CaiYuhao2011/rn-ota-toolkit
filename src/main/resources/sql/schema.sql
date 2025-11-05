DROP TABLE IF EXISTS `ota_version`;
CREATE TABLE `ota_version` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `app_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '应用名称',
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '平台(ios/android)',
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '版本号',
  `bundle_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Bundle文件名(MinIO对象名)',
  `file_size` bigint NOT NULL COMMENT '文件大小(字节)',
  `update_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'incremental' COMMENT '更新类型(incremental/full)',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '版本描述',
  `min_app_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '0.0.0' COMMENT '最小应用版本要求',
  `download_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MinIO下载URL',
  `upload_time` datetime NOT NULL COMMENT '上传时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_platform_version` (`app_name`,`platform`,`version`),
  KEY `idx_app_platform` (`app_name`,`platform`),
  KEY `idx_upload_time` (`upload_time`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTA版本表';
