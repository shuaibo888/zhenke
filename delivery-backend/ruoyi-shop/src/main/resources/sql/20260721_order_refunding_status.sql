-- 在已经执行 20260721_order_refund.sql 的环境中执行一次。
-- 修复 chk_shop_order_status 未包含退款状态，并补充退款成功时间。

ALTER TABLE shop_order
    DROP CHECK chk_shop_order_status,
    ADD CONSTRAINT chk_shop_order_status
        CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'SHIPPED', 'RECEIVED', 'CANCELLED', 'REFUNDING', 'REFUNDED'));

ALTER TABLE shop_order_refund
    MODIFY COLUMN refund_status VARCHAR(16) NOT NULL
        COMMENT 'PENDING待审核/REFUNDING退款中/REFUNDED已退款/REJECTED已驳回',
    ADD COLUMN refund_time DATETIME NULL COMMENT '支付渠道退款成功时间' AFTER audit_time;

-- 兼容补丁上线前可能已经完成的旧退款记录。
UPDATE shop_order_refund r
INNER JOIN shop_order o ON o.order_id = r.order_id
SET r.refund_status = 'REFUNDED',
    r.refund_time = COALESCE(r.refund_time, r.audit_time, r.update_time),
    r.update_time = SYSDATE()
WHERE r.refund_status = 'APPROVED' AND o.status = 'REFUNDED';
