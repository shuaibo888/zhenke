-- Existing databases must allow the refund lifecycle in order status history.
-- Safe to re-run: the named checks are replaced with the same complete definitions.
ALTER TABLE shop_order_status_log
    DROP CHECK chk_shop_order_log_from_status,
    DROP CHECK chk_shop_order_log_to_status,
    ADD CONSTRAINT chk_shop_order_log_from_status
        CHECK (from_status IS NULL OR from_status IN (
            'PENDING_PAYMENT', 'PAID', 'SHIPPED', 'RECEIVED', 'CANCELLED',
            'REFUNDING', 'REFUNDED'
        )),
    ADD CONSTRAINT chk_shop_order_log_to_status
        CHECK (to_status IN (
            'PENDING_PAYMENT', 'PAID', 'SHIPPED', 'RECEIVED', 'CANCELLED',
            'REFUNDING', 'REFUNDED'
        ));
