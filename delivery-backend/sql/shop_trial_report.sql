-- 线上试用招募、申请物流、确认收货、验证报告和首页内容流。
-- 执行前请先执行 shop_auth.sql、shop_merchant.sql、shop_product.sql。

CREATE TABLE IF NOT EXISTS `shop_trial_campaign` (
  `campaign_id` bigint NOT NULL AUTO_INCREMENT COMMENT '试用活动ID',
  `merchant_id` bigint NOT NULL COMMENT '所属商家ID',
  `product_id` bigint NOT NULL COMMENT '关联商品ID',
  `campaign_title` varchar(120) NOT NULL COMMENT '招募标题',
  `campaign_summary` varchar(500) NOT NULL COMMENT '招募说明',
  `target_count` int NOT NULL COMMENT '计划试用人数',
  `application_deadline` datetime NOT NULL COMMENT '申请截止时间',
  `status` varchar(16) NOT NULL DEFAULT 'DRAFT' COMMENT '状态（DRAFT RECRUITING CLOSED FINISHED）',
  `published_at` datetime DEFAULT NULL COMMENT '发布时间',
  `create_by` varchar(64) NOT NULL DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) NOT NULL DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`campaign_id`),
  KEY `idx_shop_trial_campaign_merchant` (`merchant_id`, `status`, `campaign_id`),
  KEY `idx_shop_trial_campaign_feed` (`status`, `application_deadline`, `published_at`),
  KEY `idx_shop_trial_campaign_product` (`product_id`, `status`),
  CONSTRAINT `fk_shop_trial_campaign_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `shop_merchant` (`merchant_id`),
  CONSTRAINT `fk_shop_trial_campaign_product` FOREIGN KEY (`product_id`) REFERENCES `shop_product` (`product_id`),
  CONSTRAINT `chk_shop_trial_campaign_target` CHECK (`target_count` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品试用招募';

CREATE TABLE IF NOT EXISTS `shop_trial_application` (
  `application_id` bigint NOT NULL AUTO_INCREMENT COMMENT '试用申请ID',
  `campaign_id` bigint NOT NULL COMMENT '活动ID',
  `shop_user_id` bigint NOT NULL COMMENT '商城用户ID',
  `apply_reason` varchar(1000) NOT NULL COMMENT '申请理由',
  `recipient_name` varchar(30) NOT NULL COMMENT '收件人',
  `recipient_phone` varchar(20) NOT NULL COMMENT '联系电话',
  `shipping_address` varchar(500) NOT NULL COMMENT '收货地址快照',
  `status` varchar(16) NOT NULL DEFAULT 'APPLIED' COMMENT '状态（APPLIED APPROVED REJECTED SHIPPED RECEIVED COMPLETED EXPIRED）',
  `audit_remark` varchar(500) DEFAULT NULL COMMENT '审核意见',
  `carrier` varchar(50) DEFAULT NULL COMMENT '物流公司',
  `tracking_no` varchar(100) DEFAULT NULL COMMENT '物流单号',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `shipped_at` datetime DEFAULT NULL COMMENT '发货时间',
  `received_at` datetime DEFAULT NULL COMMENT '确认收货时间',
  `completed_at` datetime DEFAULT NULL COMMENT '发布报告完成时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uk_shop_trial_application_user` (`campaign_id`, `shop_user_id`),
  KEY `idx_shop_trial_application_campaign` (`campaign_id`, `status`, `application_id`),
  KEY `idx_shop_trial_application_user` (`shop_user_id`, `status`, `application_id`),
  CONSTRAINT `fk_shop_trial_application_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `shop_trial_campaign` (`campaign_id`),
  CONSTRAINT `fk_shop_trial_application_user` FOREIGN KEY (`shop_user_id`) REFERENCES `shop_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户试用申请与履约状态';

CREATE TABLE IF NOT EXISTS `shop_verification_report` (
  `report_id` bigint NOT NULL AUTO_INCREMENT COMMENT '验证报告ID',
  `product_id` bigint NOT NULL COMMENT '商品ID',
  `trial_application_id` bigint NOT NULL COMMENT '完成收货的试用申请ID',
  `shop_user_id` bigint NOT NULL COMMENT '发布用户ID',
  `experience` text NOT NULL COMMENT '真实体验正文',
  `shortcoming` varchar(2000) NOT NULL COMMENT '必须展示的不足',
  `fit_crowd` varchar(1000) NOT NULL COMMENT '适合人群',
  `recommend` char(1) NOT NULL COMMENT '是否推荐（0是 1否）',
  `status` varchar(16) NOT NULL DEFAULT 'PUBLISHED' COMMENT '状态（PUBLISHED HIDDEN）',
  `published_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uk_shop_verification_report_trial` (`trial_application_id`),
  KEY `idx_shop_verification_report_feed` (`status`, `published_at`, `report_id`),
  KEY `idx_shop_verification_report_user` (`shop_user_id`, `report_id`),
  CONSTRAINT `fk_shop_verification_report_product` FOREIGN KEY (`product_id`) REFERENCES `shop_product` (`product_id`),
  CONSTRAINT `fk_shop_verification_report_trial` FOREIGN KEY (`trial_application_id`) REFERENCES `shop_trial_application` (`application_id`),
  CONSTRAINT `fk_shop_verification_report_user` FOREIGN KEY (`shop_user_id`) REFERENCES `shop_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='完成线上试用后自愿发布的验证报告';

CREATE TABLE IF NOT EXISTS `shop_verification_report_resource` (
  `resource_id` bigint NOT NULL AUTO_INCREMENT COMMENT '资源ID',
  `report_id` bigint NOT NULL COMMENT '报告ID',
  `resource_type` varchar(10) NOT NULL COMMENT '资源类型（IMAGE VIDEO）',
  `resource_url` varchar(500) NOT NULL COMMENT '资源地址',
  `resource_sort` int NOT NULL DEFAULT 1 COMMENT '资源顺序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`resource_id`),
  UNIQUE KEY `uk_shop_report_resource_sort` (`report_id`, `resource_sort`),
  CONSTRAINT `fk_shop_report_resource_report` FOREIGN KEY (`report_id`) REFERENCES `shop_verification_report` (`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证报告图片与视频';

INSERT INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `query`, `route_name`,
   `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`,
   `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES
  (3004, '试用招募', 3000, 4, 'trials', 'shop/trials/index', '', '', 1, 0, 'C', '0', '0', 'shop:trial:list', 'guide', 'admin', sysdate(), '', NULL, '商家自有试用招募'),
  (3400, '试用新增', 3004, 1, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:trial:add', '#', 'admin', sysdate(), '', NULL, ''),
  (3401, '试用发布', 3004, 2, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:trial:status', '#', 'admin', sysdate(), '', NULL, ''),
  (3402, '申请审核', 3004, 3, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:trial:audit', '#', 'admin', sysdate(), '', NULL, ''),
  (3403, '试用发货', 3004, 4, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:trial:ship', '#', 'admin', sysdate(), '', NULL, ''),
  (3005, '验证报告', 3000, 5, 'reports', 'shop/reports/index', '', '', 1, 0, 'C', '0', '0', 'shop:report:list', 'documentation', 'admin', sysdate(), '', NULL, '验证报告查看')
ON DUPLICATE KEY UPDATE
  `menu_name` = VALUES(`menu_name`), `parent_id` = VALUES(`parent_id`), `order_num` = VALUES(`order_num`),
  `path` = VALUES(`path`), `component` = VALUES(`component`), `menu_type` = VALUES(`menu_type`),
  `visible` = VALUES(`visible`), `status` = VALUES(`status`), `perms` = VALUES(`perms`),
  `icon` = VALUES(`icon`), `update_by` = 'admin', `update_time` = sysdate(), `remark` = VALUES(`remark`);

INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.`role_id`, p.`menu_id`
FROM `sys_role` r
JOIN (SELECT 3004 AS menu_id UNION ALL SELECT 3400 UNION ALL SELECT 3401 UNION ALL SELECT 3402 UNION ALL SELECT 3403 UNION ALL SELECT 3005) p
WHERE r.`role_key` = 'merchant' AND r.`del_flag` = '0'
  AND NOT EXISTS (
    SELECT 1 FROM `sys_role_menu` rm WHERE rm.`role_id` = r.`role_id` AND rm.`menu_id` = p.`menu_id`
  );
