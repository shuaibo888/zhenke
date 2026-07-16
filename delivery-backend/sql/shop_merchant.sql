-- 商家入驻、审核日志、后台角色与权限。执行前请确认当前数据库为 delivery_platform。
-- 若数据库已执行过“依赖 shop_user 申请”的旧版脚本，请改为先执行 shop_merchant_direct_apply_migration.sql。

CREATE TABLE IF NOT EXISTS `shop_merchant` (
  `merchant_id` bigint NOT NULL AUTO_INCREMENT COMMENT '商家ID',
  `application_no` varchar(40) NOT NULL COMMENT '商家申请编号',
  `account_username` varchar(30) NOT NULL COMMENT '申请人预设的商家后台账号',
  `account_password` varchar(100) DEFAULT NULL COMMENT '审核前暂存的BCrypt密码，审核通过后清空',
  `query_token_hash` varchar(100) NOT NULL COMMENT '申请状态查询令牌BCrypt摘要',
  `company_name` varchar(100) NOT NULL COMMENT '公司或经营主体名称',
  `company_address` varchar(255) NOT NULL COMMENT '公司地址',
  `contact_name` varchar(30) NOT NULL COMMENT '联系人',
  `contact_phone` varchar(20) NOT NULL COMMENT '联系电话',
  `business_license` varchar(500) NOT NULL COMMENT '营业执照图片或资源地址',
  `product_intro` varchar(2000) NOT NULL COMMENT '产品介绍',
  `origin_traceability` varchar(2000) NOT NULL COMMENT '产地溯源说明',
  `accepts_verification_recruitment` char(1) NOT NULL DEFAULT '0' COMMENT '承诺验证招募（0是 1否）',
  `accepts_public_welfare` char(1) NOT NULL DEFAULT '0' COMMENT '接受公益分成（0是 1否）',
  `protocol_agreed` char(1) NOT NULL DEFAULT '0' COMMENT '同意入驻协议（0是 1否）',
  `audit_status` varchar(16) NOT NULL DEFAULT 'PENDING' COMMENT '审核状态（PENDING APPROVED REJECTED）',
  `audit_remark` varchar(500) DEFAULT NULL COMMENT '审核说明或驳回原因',
  `admin_user_id` bigint DEFAULT NULL COMMENT '绑定的若依后台用户ID',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '商家状态（0正常 1停用）',
  `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
  `audit_by` varchar(64) NOT NULL DEFAULT '' COMMENT '审核人',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `create_by` varchar(64) NOT NULL DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) NOT NULL DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`merchant_id`),
  UNIQUE KEY `uk_shop_merchant_application_no` (`application_no`),
  UNIQUE KEY `uk_shop_merchant_account_username` (`account_username`),
  UNIQUE KEY `uk_shop_merchant_admin_user` (`admin_user_id`),
  KEY `idx_shop_merchant_audit_status` (`audit_status`, `status`),
  KEY `idx_shop_merchant_company_name` (`company_name`),
  CONSTRAINT `fk_shop_merchant_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家主体与入驻状态';

CREATE TABLE IF NOT EXISTS `shop_merchant_audit_log` (
  `log_id` bigint NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `merchant_id` bigint NOT NULL COMMENT '商家ID',
  `action` varchar(20) NOT NULL COMMENT '操作（SUBMIT RESUBMIT APPROVE REJECT ENABLE DISABLE）',
  `from_status` varchar(16) DEFAULT NULL COMMENT '原审核状态',
  `to_status` varchar(16) DEFAULT NULL COMMENT '新审核状态',
  `audit_remark` varchar(500) DEFAULT NULL COMMENT '操作说明',
  `operator_type` varchar(24) NOT NULL COMMENT '操作人类型（MERCHANT_APPLICANT SYS_USER）',
  `operator_id` bigint DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(64) NOT NULL DEFAULT '' COMMENT '操作人账号',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`log_id`),
  KEY `idx_shop_merchant_audit_log_merchant` (`merchant_id`, `log_id`),
  CONSTRAINT `fk_shop_merchant_audit_log_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `shop_merchant` (`merchant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家入驻与状态审计日志';

-- 为审核通过的商家后台账号准备独立若依角色。
INSERT INTO `sys_role`
  (`role_name`, `role_key`, `role_sort`, `data_scope`, `menu_check_strictly`, `dept_check_strictly`,
   `status`, `del_flag`, `create_by`, `create_time`, `remark`)
SELECT '商家', 'merchant', 20, '5', 1, 1, '0', '0', 'admin', sysdate(), '商家后台角色，业务数据按商家ID隔离'
WHERE NOT EXISTS (SELECT 1 FROM `sys_role` WHERE `role_key` = 'merchant' AND `del_flag` = '0');

UPDATE `sys_role`
SET `role_name` = '商家', `role_sort` = 20, `data_scope` = '5', `status` = '0',
    `update_by` = 'admin', `update_time` = sysdate(),
    `remark` = '商家后台角色，业务数据按商家ID隔离'
WHERE `role_key` = 'merchant' AND `del_flag` = '0';

INSERT INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `query`, `route_name`,
   `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`,
   `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES
  (3002, '商家管理', 3000, 2, 'merchants', 'shop/merchants/index', '', '', 1, 0, 'C', '0', '0', 'shop:merchant:list', 'peoples', 'admin', sysdate(), '', NULL, '商家入驻审核与启停'),
  (3200, '商家查询', 3002, 1, '', '', '', '', 1, 0, 'F', '0', '0', 'shop:merchant:query', '#', 'admin', sysdate(), '', NULL, ''),
  (3201, '商家审核', 3002, 2, '', '', '', '', 1, 0, 'F', '0', '0', 'shop:merchant:audit', '#', 'admin', sysdate(), '', NULL, ''),
  (3202, '商家状态', 3002, 3, '', '', '', '', 1, 0, 'F', '0', '0', 'shop:merchant:status', '#', 'admin', sysdate(), '', NULL, ''),
  (3203, '商家自有上下文', 3002, 4, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:merchant:self', '#', 'admin', sysdate(), '', NULL, '商家后台查询自己的商家ID')
ON DUPLICATE KEY UPDATE
  `menu_name` = VALUES(`menu_name`), `parent_id` = VALUES(`parent_id`), `order_num` = VALUES(`order_num`),
  `path` = VALUES(`path`), `component` = VALUES(`component`), `menu_type` = VALUES(`menu_type`),
  `visible` = VALUES(`visible`), `status` = VALUES(`status`), `perms` = VALUES(`perms`),
  `icon` = VALUES(`icon`), `update_by` = 'admin', `update_time` = sysdate(), `remark` = VALUES(`remark`);

-- 商家角色只授予当前商家上下文权限；商品、订单等权限在对应模块落地后再追加。
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.`role_id`, 3203
FROM `sys_role` r
WHERE r.`role_key` = 'merchant' AND r.`del_flag` = '0'
  AND NOT EXISTS (
    SELECT 1 FROM `sys_role_menu` rm WHERE rm.`role_id` = r.`role_id` AND rm.`menu_id` = 3203
  );
