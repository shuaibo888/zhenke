-- 接入 Spring AI + Qwen-Plus 甄客验评分前执行一次。
-- 当前项目未接入自动迁移工具；本脚本不是幂等脚本，禁止在未知结构上重复执行。

ALTER TABLE shop_verification_report
    ADD COLUMN ai_score DECIMAL(2,1) NULL COMMENT '当前有效AI评分，0.0至5.0' AFTER service_attitude,
    ADD COLUMN ai_score_status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        COMMENT 'PENDING/RUNNING/SUCCEEDED/FAILED' AFTER ai_score,
    ADD COLUMN ai_scored_at DATETIME NULL COMMENT '当前有效评分完成时间' AFTER ai_score_status,
    ADD COLUMN current_ai_score_id BIGINT NULL COMMENT '当前有效评分审计记录ID' AFTER ai_scored_at,
    ADD COLUMN running_ai_score_id BIGINT NULL COMMENT '当前执行中的评分审计记录ID' AFTER current_ai_score_id,
    ADD COLUMN ai_score_version VARCHAR(64) NULL COMMENT '当前任务提示词版本' AFTER running_ai_score_id,
    ADD COLUMN ai_score_input_hash CHAR(64) NULL COMMENT '当前评分输入SHA-256' AFTER ai_score_version,
    ADD COLUMN ai_score_attempts INT NOT NULL DEFAULT 0 COMMENT '当前版本已尝试次数' AFTER ai_score_input_hash,
    ADD COLUMN ai_score_next_retry_at DATETIME NULL COMMENT '下次自动重试时间' AFTER ai_score_attempts,
    ADD COLUMN ai_score_updated_at DATETIME NULL COMMENT '评分任务状态更新时间' AFTER ai_score_next_retry_at,
    ADD KEY idx_report_ai_score_task (ai_score_status, ai_score_next_retry_at, report_id),
    ADD CONSTRAINT chk_report_ai_score CHECK (ai_score IS NULL OR (ai_score >= 0.0 AND ai_score <= 5.0)),
    ADD CONSTRAINT chk_report_ai_score_status
        CHECK (ai_score_status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'));

CREATE TABLE shop_verification_report_ai_score
(
    score_id          BIGINT        NOT NULL AUTO_INCREMENT COMMENT '评分记录ID',
    report_id         BIGINT        NOT NULL COMMENT '甄客验ID',
    status            VARCHAR(16)   NOT NULL COMMENT 'RUNNING/SUCCEEDED/FAILED',
    score             DECIMAL(2,1)  NULL COMMENT '本次评分',
    reason            VARCHAR(300)  NULL COMMENT '面向业务展示的评分理由摘要',
    dimensions_json   VARCHAR(1000) NULL COMMENT '评分维度JSON',
    model_provider    VARCHAR(64)   NOT NULL COMMENT '模型供应商',
    model_name        VARCHAR(128)  NOT NULL COMMENT '模型名',
    prompt_version    VARCHAR(64)   NOT NULL COMMENT '提示词版本',
    input_hash        CHAR(64)      NOT NULL COMMENT '评分输入SHA-256',
    error_message     VARCHAR(500)  NULL COMMENT '脱敏后的失败原因',
    started_at        DATETIME      NOT NULL COMMENT '调用开始时间',
    completed_at      DATETIME      NULL COMMENT '调用完成时间',
    create_time       DATETIME      NOT NULL COMMENT '创建时间',
    PRIMARY KEY (score_id),
    KEY idx_ai_score_report (report_id, score_id),
    KEY idx_ai_score_running (status, started_at),
    CONSTRAINT chk_ai_score_history_score CHECK (score IS NULL OR (score >= 0.0 AND score <= 5.0)),
    CONSTRAINT chk_ai_score_history_status CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='甄客验AI评分审计记录';

-- 现有已发布甄客验进入待评分队列；模型调用由应用调度任务在事务外完成。
UPDATE shop_verification_report
SET ai_score_status = 'PENDING',
    ai_score_attempts = 0,
    ai_score_next_retry_at = NULL,
    ai_score_updated_at = SYSDATE()
WHERE status = 'PUBLISHED';
