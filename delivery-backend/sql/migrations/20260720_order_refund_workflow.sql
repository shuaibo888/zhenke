-- 模拟支付阶段的订单退款审核流程。
-- 依赖：20260717_order_refund_application.sql 已执行。本脚本允许重复执行。

SET @refund_workflow_schema = DATABASE();

SET @refund_workflow_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @refund_workflow_schema
      AND TABLE_NAME = 'shop_order'
      AND COLUMN_NAME = 'refund_audit_time'
  ),
  'SELECT 1',
  'ALTER TABLE `shop_order` ADD COLUMN `refund_audit_time` datetime NULL DEFAULT NULL COMMENT ''退款审核时间'' AFTER `refund_apply_time`'
);
PREPARE refund_workflow_stmt FROM @refund_workflow_sql;
EXECUTE refund_workflow_stmt;
DEALLOCATE PREPARE refund_workflow_stmt;

SET @refund_workflow_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @refund_workflow_schema
      AND TABLE_NAME = 'shop_order'
      AND COLUMN_NAME = 'refund_complete_time'
  ),
  'SELECT 1',
  'ALTER TABLE `shop_order` ADD COLUMN `refund_complete_time` datetime NULL DEFAULT NULL COMMENT ''模拟退款完成时间'' AFTER `refund_audit_time`'
);
PREPARE refund_workflow_stmt FROM @refund_workflow_sql;
EXECUTE refund_workflow_stmt;
DEALLOCATE PREPARE refund_workflow_stmt;

SET @refund_workflow_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @refund_workflow_schema
      AND TABLE_NAME = 'shop_order'
      AND COLUMN_NAME = 'refund_audit_remark'
  ),
  'SELECT 1',
  'ALTER TABLE `shop_order` ADD COLUMN `refund_audit_remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT ''退款审核说明'' AFTER `refund_complete_time`'
);
PREPARE refund_workflow_stmt FROM @refund_workflow_sql;
EXECUTE refund_workflow_stmt;
DEALLOCATE PREPARE refund_workflow_stmt;

-- 无论此前是第一阶段约束还是本流程约束，都统一重建为当前状态集合。
SET @refund_workflow_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @refund_workflow_schema
      AND TABLE_NAME = 'shop_order'
      AND CONSTRAINT_NAME = 'chk_shop_order_refund_status'
      AND CONSTRAINT_TYPE = 'CHECK'
  ),
  'ALTER TABLE `shop_order` DROP CHECK `chk_shop_order_refund_status`',
  'SELECT 1'
);
PREPARE refund_workflow_stmt FROM @refund_workflow_sql;
EXECUTE refund_workflow_stmt;
DEALLOCATE PREPARE refund_workflow_stmt;

ALTER TABLE `shop_order`
  ADD CONSTRAINT `chk_shop_order_refund_status`
    CHECK (`refund_status` IN ('NONE', 'APPLIED', 'APPROVED', 'REJECTED', 'REFUNDED'));

CREATE TABLE IF NOT EXISTS `shop_order_refund_log` (
  `log_id` bigint NOT NULL AUTO_INCREMENT COMMENT '退款操作日志ID',
  `order_id` bigint NOT NULL COMMENT '订单ID',
  `from_status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    COMMENT '操作人类型（SHOP_USER MERCHANT SYSTEM）',
  `operator_id` bigint NULL DEFAULT NULL COMMENT '操作人ID，系统操作为空',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_shop_order_refund_log_order` (`order_id`, `log_id`),
  CONSTRAINT `fk_shop_order_refund_log_order`
    FOREIGN KEY (`order_id`) REFERENCES `shop_order` (`order_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_shop_order_refund_log_from_status`
    CHECK (`from_status` IN ('NONE', 'APPLIED', 'APPROVED', 'REJECTED', 'REFUNDED')),
  CONSTRAINT `chk_shop_order_refund_log_to_status`
    CHECK (`to_status` IN ('NONE', 'APPLIED', 'APPROVED', 'REJECTED', 'REFUNDED')),
  CONSTRAINT `chk_shop_order_refund_log_operator_type`
    CHECK (`operator_type` IN ('SHOP_USER', 'MERCHANT', 'SYSTEM'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单退款操作日志';

SET @refund_workflow_sql = NULL;
SET @refund_workflow_schema = NULL;
