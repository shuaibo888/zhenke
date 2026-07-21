-- 上线包含真实退款流程的后端前执行一次。当前项目未接入自动迁移工具。

CREATE TABLE shop_order_refund
(
    refund_id       BIGINT       NOT NULL AUTO_INCREMENT COMMENT '退款申请ID',
    order_id        BIGINT       NOT NULL COMMENT '订单ID',
    user_id         BIGINT       NOT NULL COMMENT '商城用户ID',
    merchant_id     BIGINT       NOT NULL COMMENT '商家ID',
    refund_status   VARCHAR(16)  NOT NULL COMMENT 'PENDING待审核/APPROVED已退款/REJECTED已驳回',
    refund_reason   VARCHAR(200) NOT NULL COMMENT '退款原因',
    review_required CHAR(1)      NOT NULL DEFAULT '1' COMMENT '是否需要商家审核',
    audit_remark    VARCHAR(200) NULL COMMENT '商家审核说明',
    audit_by        BIGINT       NULL COMMENT '审核商家后台用户ID',
    request_time    DATETIME     NOT NULL COMMENT '申请时间',
    audit_time      DATETIME     NULL COMMENT '审核或自动处理时间',
    create_time     DATETIME     NOT NULL COMMENT '创建时间',
    update_time     DATETIME     NOT NULL COMMENT '更新时间',
    PRIMARY KEY (refund_id),
    KEY idx_order_refund_order (order_id, refund_id),
    KEY idx_order_refund_merchant_status (merchant_id, refund_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商城订单退款申请';
