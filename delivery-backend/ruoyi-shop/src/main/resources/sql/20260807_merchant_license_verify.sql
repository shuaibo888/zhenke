-- 商家入驻营业执照识别 + 核验：一次性脚本，只执行一次，勿重复执行。
-- 用途：shop_merchant 新增统一社会信用代码、法定代表人、核验状态三列，
--       由商家入驻申请时的阿里云营业执照识别/核验结果填充，供管理端审核留痕。
ALTER TABLE shop_merchant
    ADD COLUMN company_credit_code VARCHAR(50) NULL COMMENT '统一社会信用代码（营业执照识别核验）' AFTER business_license,
    ADD COLUMN legal_person VARCHAR(50) NULL COMMENT '法定代表人（营业执照识别核验）' AFTER company_credit_code,
    ADD COLUMN license_verified CHAR(1) NULL DEFAULT '0' COMMENT '营业执照核验是否通过 0否 1是' AFTER legal_person;
