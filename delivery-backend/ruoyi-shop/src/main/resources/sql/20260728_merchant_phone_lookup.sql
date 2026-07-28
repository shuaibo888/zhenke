-- 商家入驻统一使用手机号查询，并保证一个手机号只能申请一次。
-- 与包含本次改动的后端版本一起发布，只执行一次。
-- 执行前先确认下面的重复检查没有返回数据；如有测试脏数据，请先自行保留一条并删除其余重复申请。

SELECT `contact_phone`, COUNT(*) AS `duplicate_count`
FROM `shop_merchant`
WHERE `del_flag` = '0'
GROUP BY `contact_phone`
HAVING COUNT(*) > 1;

ALTER TABLE `shop_merchant`
  MODIFY COLUMN `application_no` varchar(40) NOT NULL COMMENT '商家申请内部编号',
  DROP COLUMN `query_token_hash`,
  ADD UNIQUE KEY `uk_shop_merchant_contact_phone` (`contact_phone`);
