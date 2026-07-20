-- 上线新后端前执行一次。当前项目未接入自动迁移工具。

CREATE TABLE shop_verification_report_useful
(
    useful_id    BIGINT       NOT NULL AUTO_INCREMENT COMMENT '有用记录ID',
    report_id    BIGINT       NOT NULL COMMENT '甄客验ID',
    shop_user_id BIGINT       NOT NULL COMMENT '商城用户ID',
    create_time  DATETIME     NOT NULL COMMENT '创建时间',
    PRIMARY KEY (useful_id),
    UNIQUE KEY uk_report_useful_user (report_id, shop_user_id),
    KEY idx_report_useful_user (shop_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='甄客验认为有用记录';

ALTER TABLE shop_cart_item
    ADD COLUMN source_report_id BIGINT NULL COMMENT '购买来源甄客验ID' AFTER product_id,
    ADD KEY idx_cart_source_report (source_report_id);

ALTER TABLE shop_order_item
    ADD COLUMN source_report_id BIGINT NULL COMMENT '购买来源甄客验ID' AFTER product_id,
    ADD KEY idx_order_item_source_report (source_report_id);

ALTER TABLE shop_verification_report
    MODIFY COLUMN trial_application_id BIGINT NULL COMMENT '试用申请ID',
    ADD COLUMN report_source VARCHAR(16) NOT NULL DEFAULT 'TRIAL' COMMENT 'TRIAL试用报告/PURCHASE购买评价' AFTER trial_application_id,
    ADD COLUMN order_item_id BIGINT NULL COMMENT '购买评价关联订单商品明细ID' AFTER report_source,
    ADD COLUMN source_report_id BIGINT NULL COMMENT '促成本次购买的来源甄客验ID' AFTER order_item_id,
    ADD COLUMN product_quality TINYINT NULL COMMENT '商品质量1-5分' AFTER recommend,
    ADD COLUMN logistics_service TINYINT NULL COMMENT '物流服务1-5分' AFTER product_quality,
    ADD COLUMN service_attitude TINYINT NULL COMMENT '服务态度1-5分' AFTER logistics_service,
    ADD UNIQUE KEY uk_report_order_item (order_item_id),
    ADD KEY idx_report_source (report_source),
    ADD KEY idx_report_source_report (source_report_id);
