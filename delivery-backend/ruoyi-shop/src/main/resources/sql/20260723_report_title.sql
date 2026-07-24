-- 新增甄客验用户自定义标题，上线包含本次代码的后端前执行一次。
-- 当前项目未接入自动迁移工具，请勿重复执行本脚本。

ALTER TABLE shop_verification_report
    ADD COLUMN report_title VARCHAR(100) NULL COMMENT '用户填写的甄客验标题' AFTER source_report_id;

-- 历史甄客验没有用户标题，先用绑定商品名称补齐，保证首页与详情兼容。
UPDATE shop_verification_report r
INNER JOIN shop_product p ON p.product_id = r.product_id
SET r.report_title = p.product_name
WHERE r.report_title IS NULL OR TRIM(r.report_title) = '';

ALTER TABLE shop_verification_report
    MODIFY COLUMN report_title VARCHAR(100) NOT NULL COMMENT '用户填写的甄客验标题';
