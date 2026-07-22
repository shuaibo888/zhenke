-- 接入微信支付 APIv3 前执行一次。当前项目未接入自动迁移工具。
-- 前置：已执行 20260721_order_refund.sql 与 20260721_order_refunding_status.sql。

ALTER TABLE shop_order
    ADD COLUMN payment_channel VARCHAR(16) NULL COMMENT '支付渠道：WECHAT/MOCK' AFTER item_count,
    ADD COLUMN payment_trade_type VARCHAR(16) NULL COMMENT '微信交易类型：JSAPI/H5' AFTER payment_channel,
    ADD COLUMN payment_mch_id VARCHAR(32) NULL COMMENT '支付时使用的微信商户号' AFTER payment_trade_type,
    ADD COLUMN payment_app_id VARCHAR(32) NULL COMMENT '支付时使用的微信AppID' AFTER payment_mch_id,
    ADD COLUMN wechat_transaction_id VARCHAR(64) NULL COMMENT '微信支付订单号' AFTER payment_app_id,
    ADD UNIQUE KEY uk_shop_order_wechat_transaction (wechat_transaction_id);

ALTER TABLE shop_order_refund
    ADD COLUMN out_refund_no VARCHAR(64) NULL COMMENT '商户退款单号' AFTER refund_time,
    ADD COLUMN wechat_refund_id VARCHAR(64) NULL COMMENT '微信支付退款单号' AFTER out_refund_no,
    ADD COLUMN channel_status VARCHAR(16) NULL COMMENT '微信退款状态/ERROR' AFTER wechat_refund_id,
    ADD COLUMN channel_error VARCHAR(500) NULL COMMENT '最近一次微信退款错误' AFTER channel_status,
    ADD COLUMN channel_last_attempt_time DATETIME NULL COMMENT '最近一次退款请求或查询时间' AFTER channel_error,
    ADD UNIQUE KEY uk_shop_order_refund_out_no (out_refund_no);

-- 已有环境中的历史订单均来自模拟支付，不允许误向新配置的微信商户发起原路退款。
UPDATE shop_order
SET payment_channel = 'MOCK'
WHERE payment_channel IS NULL
  AND status IN ('PAID', 'SHIPPED', 'RECEIVED', 'REFUNDING', 'REFUNDED');

-- 补齐补丁上线前已经进入退款中的记录编号，供后台明确识别为历史模拟退款。
UPDATE shop_order_refund r
INNER JOIN shop_order o ON o.order_id = r.order_id
SET r.channel_status = 'LEGACY_MOCK',
    r.channel_error = '历史模拟支付订单，不能向微信支付发起原路退款',
    r.update_time = SYSDATE()
WHERE r.refund_status = 'REFUNDING'
  AND o.payment_channel = 'MOCK';
