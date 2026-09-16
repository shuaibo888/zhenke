-- Apply once, after backup and staging verification, before deploying the new backend.
-- Existing applications remain REFUND_ONLY; no historical rows are removed.
ALTER TABLE shop_order_refund
  ADD COLUMN refund_type varchar(20) NOT NULL DEFAULT 'REFUND_ONLY',
  ADD COLUMN return_recipient varchar(50) NULL,
  ADD COLUMN return_phone varchar(30) NULL,
  ADD COLUMN return_address varchar(500) NULL,
  ADD COLUMN return_tracking_no varchar(100) NULL,
  ADD COLUMN return_ship_time datetime NULL,
  ADD COLUMN return_receive_time datetime NULL;

-- Inspect existing CHECK definitions. Expand the status-only constraint if present.
-- Abort rather than silently remove a compound business constraint.
DELIMITER $$
CREATE PROCEDURE migrate_return_refund_status_20260916()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE check_name VARCHAR(64);
  DECLARE check_clause LONGTEXT;
  DECLARE checks_cursor CURSOR FOR
    SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
    FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.CHECK_CONSTRAINTS cc
      ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'shop_order_refund'
      AND tc.CONSTRAINT_TYPE = 'CHECK' AND cc.CHECK_CLAUSE LIKE '%refund_status%';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  OPEN checks_cursor;
  read_checks: LOOP
    FETCH checks_cursor INTO check_name, check_clause;
    IF done THEN LEAVE read_checks; END IF;
    IF LOWER(check_clause) REGEXP '[[:space:]](and|or)[[:space:]]' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Review compound refund_status CHECK before migration';
    END IF;
    SET @drop_refund_check = CONCAT('ALTER TABLE shop_order_refund DROP CHECK `', REPLACE(check_name, '`', '``'), '`');
    PREPARE stmt FROM @drop_refund_check;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE checks_cursor;
END$$
DELIMITER ;
CALL migrate_return_refund_status_20260916();
DROP PROCEDURE migrate_return_refund_status_20260916;

ALTER TABLE shop_order_refund
  ADD CONSTRAINT chk_refund_status_20260916 CHECK
    (refund_status IN ('PENDING', 'WAITING_RETURN', 'RETURN_SHIPPED', 'REFUNDING', 'REFUNDED', 'REJECTED')),
  ADD CONSTRAINT chk_refund_type_20260916 CHECK (refund_type IN ('REFUND_ONLY', 'RETURN_REFUND'));
