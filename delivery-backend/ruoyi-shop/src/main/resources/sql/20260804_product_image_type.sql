-- 商品主图与详情图分类迁移；与 2026-08-04 商品图片版后端一起发布，只执行一次。
-- 现有商品图片统一按主图迁移，后端读取时会自动排除与封面地址相同的历史重复图片。

ALTER TABLE `shop_product_image`
  ADD COLUMN `image_type` varchar(16) NOT NULL DEFAULT 'MAIN' COMMENT '图片类型：MAIN主图，DETAIL详情图' AFTER `product_id`,
  DROP INDEX `uk_shop_product_image_sort`,
  ADD UNIQUE KEY `uk_shop_product_image_type_sort` (`product_id`, `image_type`, `image_sort`);
