-- 退款售后第一阶段：仅登记申请，不执行真实资金退款。
-- 本脚本允许重复执行，也兼容已通过初始化 SQL 创建退款字段的数据库。

SET @refund_migration_schema = DATABASE();

SET @refund_migration_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @refund_migration_schema
      AND TABLE_NAME = 'shop_order'
      AND COLUMN_NAME = 'refund_status'
  ),
  'SELECT 1',
  'ALTER TABLE `shop_order` ADD COLUMN `refund_status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''NONE'' COMMENT ''退款申请状态'' AFTER `cancel_time`'
);
PREPARE refund_migration_stmt FROM @refund_migration_sql;
EXECUTE refund_migration_stmt;
DEALLOCATE PREPARE refund_migration_stmt;

SET @refund_migration_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @refund_migration_schema
      AND TABLE_NAME = 'shop_order'
      AND COLUMN_NAME = 'refund_apply_time'
  ),
  'SELECT 1',
  'ALTER TABLE `shop_order` ADD COLUMN `refund_apply_time` datetime NULL DEFAULT NULL COMMENT ''退款申请时间'' AFTER `refund_status`'
);
PREPARE refund_migration_stmt FROM @refund_migration_sql;
EXECUTE refund_migration_stmt;
DEALLOCATE PREPARE refund_migration_stmt;

SET @refund_migration_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @refund_migration_schema
      AND TABLE_NAME = 'shop_order'
      AND INDEX_NAME = 'idx_shop_order_refund_status'
  ),
  'SELECT 1',
  'ALTER TABLE `shop_order` ADD INDEX `idx_shop_order_refund_status` (`refund_status`, `order_id`)'
);
PREPARE refund_migration_stmt FROM @refund_migration_sql;
EXECUTE refund_migration_stmt;
DEALLOCATE PREPARE refund_migration_stmt;

SET @refund_migration_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @refund_migration_schema
      AND TABLE_NAME = 'shop_order'
      AND CONSTRAINT_NAME = 'chk_shop_order_refund_status'
      AND CONSTRAINT_TYPE = 'CHECK'
  ),
  'SELECT 1',
  'ALTER TABLE `shop_order` ADD CONSTRAINT `chk_shop_order_refund_status` CHECK (`refund_status` IN (''NONE'', ''APPLIED''))'
);
PREPARE refund_migration_stmt FROM @refund_migration_sql;
EXECUTE refund_migration_stmt;
DEALLOCATE PREPARE refund_migration_stmt;

SET @refund_migration_sql = NULL;
SET @refund_migration_schema = NULL;
