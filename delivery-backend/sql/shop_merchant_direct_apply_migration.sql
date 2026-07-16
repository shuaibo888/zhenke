-- 仅用于已经执行过旧版 shop_merchant.sql（商家申请依赖 shop_user）的数据库，执行一次即可。
-- 全新数据库不要执行本文件，直接执行最新版 shop_merchant.sql。
-- 旧版未审核申请会转为 REJECTED，申请人需从首页按新流程重新提交；已审核商家账号保持有效。

ALTER TABLE `shop_merchant`
  DROP FOREIGN KEY `fk_shop_merchant_applicant`,
  DROP INDEX `uk_shop_merchant_applicant`,
  ADD COLUMN `application_no` varchar(40) DEFAULT NULL COMMENT '商家申请编号' AFTER `merchant_id`,
  ADD COLUMN `account_username` varchar(30) DEFAULT NULL COMMENT '申请人预设的商家后台账号' AFTER `application_no`,
  ADD COLUMN `account_password` varchar(100) DEFAULT NULL COMMENT '审核前暂存的BCrypt密码，审核通过后清空' AFTER `account_username`,
  ADD COLUMN `query_token_hash` varchar(100) DEFAULT NULL COMMENT '申请状态查询令牌BCrypt摘要' AFTER `account_password`;

UPDATE `shop_merchant` m
LEFT JOIN `sys_user` su ON su.`user_id` = m.`admin_user_id`
SET m.`application_no` = CONCAT('LEGACY-', m.`merchant_id`),
    m.`account_username` = COALESCE(su.`user_name`, CONCAT('legacy_merchant_', m.`merchant_id`)),
    m.`query_token_hash` = 'LEGACY_STATUS_UNAVAILABLE',
    m.`audit_remark` = CASE
      WHEN m.`audit_status` = 'APPROVED' THEN m.`audit_remark`
      ELSE '入驻流程已升级为首页独立申请，请重新提交'
    END,
    m.`audit_status` = CASE WHEN m.`audit_status` = 'APPROVED' THEN 'APPROVED' ELSE 'REJECTED' END;

ALTER TABLE `shop_merchant`
  DROP COLUMN `applicant_user_id`,
  MODIFY COLUMN `application_no` varchar(40) NOT NULL COMMENT '商家申请编号',
  MODIFY COLUMN `account_username` varchar(30) NOT NULL COMMENT '申请人预设的商家后台账号',
  MODIFY COLUMN `query_token_hash` varchar(100) NOT NULL COMMENT '申请状态查询令牌BCrypt摘要',
  ADD UNIQUE KEY `uk_shop_merchant_application_no` (`application_no`),
  ADD UNIQUE KEY `uk_shop_merchant_account_username` (`account_username`);

ALTER TABLE `shop_merchant_audit_log`
  MODIFY COLUMN `operator_type` varchar(24) NOT NULL COMMENT '操作人类型（MERCHANT_APPLICANT SYS_USER）';
