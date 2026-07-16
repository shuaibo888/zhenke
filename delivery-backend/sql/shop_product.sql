-- 固定四分类、商品、商品图片与对应权限。执行前请确认商家模块已初始化。

CREATE TABLE IF NOT EXISTS `shop_product_category` (
  `category_id` bigint NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `category_code` varchar(32) NOT NULL COMMENT '稳定分类编码',
  `category_name` varchar(50) NOT NULL COMMENT '分类显示名称',
  `category_sort` int NOT NULL COMMENT '显示顺序',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `create_by` varchar(64) NOT NULL DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) NOT NULL DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_shop_product_category_code` (`category_code`),
  KEY `idx_shop_product_category_sort` (`category_sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='固定商品分类';

INSERT INTO `shop_product_category`
  (`category_id`, `category_code`, `category_name`, `category_sort`, `status`, `create_by`)
VALUES
  (1, 'CATEGORY_1', '第一分类', 1, '0', 'admin'),
  (2, 'CATEGORY_2', '第二分类', 2, '0', 'admin'),
  (3, 'CATEGORY_3', '第三分类', 3, '0', 'admin'),
  (4, 'CATEGORY_4', '第四分类', 4, '0', 'admin')
ON DUPLICATE KEY UPDATE
  `category_code` = VALUES(`category_code`);

CREATE TABLE IF NOT EXISTS `shop_product` (
  `product_id` bigint NOT NULL AUTO_INCREMENT COMMENT '商品ID',
  `merchant_id` bigint NOT NULL COMMENT '所属商家ID',
  `category_id` bigint NOT NULL COMMENT '分类ID',
  `product_name` varchar(120) NOT NULL COMMENT '商品名称',
  `subtitle` varchar(200) DEFAULT NULL COMMENT '商品副标题',
  `detail` text NOT NULL COMMENT '商品详情',
  `cover_url` varchar(500) NOT NULL COMMENT '封面资源地址',
  `price` decimal(10,2) NOT NULL COMMENT '销售价格',
  `stock` int NOT NULL DEFAULT 0 COMMENT '可售库存',
  `sales_count` int NOT NULL DEFAULT 0 COMMENT '销量',
  `status` varchar(16) NOT NULL DEFAULT 'DRAFT' COMMENT '状态（DRAFT ON_SALE OFF_SALE）',
  `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
  `create_by` varchar(64) NOT NULL DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) NOT NULL DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`product_id`),
  KEY `idx_shop_product_merchant_status` (`merchant_id`, `status`, `product_id`),
  KEY `idx_shop_product_category_status` (`category_id`, `status`, `product_id`),
  CONSTRAINT `fk_shop_product_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `shop_merchant` (`merchant_id`),
  CONSTRAINT `fk_shop_product_category` FOREIGN KEY (`category_id`) REFERENCES `shop_product_category` (`category_id`),
  CONSTRAINT `chk_shop_product_price` CHECK (`price` > 0),
  CONSTRAINT `chk_shop_product_stock` CHECK (`stock` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品主表';

CREATE TABLE IF NOT EXISTS `shop_product_image` (
  `image_id` bigint NOT NULL AUTO_INCREMENT COMMENT '图片ID',
  `product_id` bigint NOT NULL COMMENT '商品ID',
  `image_url` varchar(500) NOT NULL COMMENT '图片资源地址',
  `image_sort` int NOT NULL DEFAULT 1 COMMENT '图片顺序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`image_id`),
  UNIQUE KEY `uk_shop_product_image_sort` (`product_id`, `image_sort`),
  CONSTRAINT `fk_shop_product_image_product` FOREIGN KEY (`product_id`) REFERENCES `shop_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品图片';

INSERT INTO `sys_menu`
  (`menu_id`, `menu_name`, `parent_id`, `order_num`, `path`, `component`, `query`, `route_name`,
   `is_frame`, `is_cache`, `menu_type`, `visible`, `status`, `perms`, `icon`,
   `create_by`, `create_time`, `update_by`, `update_time`, `remark`)
VALUES
  (3003, '商品管理', 3000, 3, 'products', 'shop/products/index', '', '', 1, 0, 'C', '0', '0', 'shop:product:list', 'shopping', 'admin', sysdate(), '', NULL, '商品管理'),
  (3300, '商品查询', 3003, 1, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:product:query', '#', 'admin', sysdate(), '', NULL, ''),
  (3301, '商品新增', 3003, 2, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:product:add', '#', 'admin', sysdate(), '', NULL, ''),
  (3302, '商品修改', 3003, 3, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:product:edit', '#', 'admin', sysdate(), '', NULL, ''),
  (3303, '商品上下架', 3003, 4, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:product:status', '#', 'admin', sysdate(), '', NULL, ''),
  (3304, '分类管理', 3003, 5, '', '', '', '', 1, 0, 'F', '1', '0', 'shop:category:edit', '#', 'admin', sysdate(), '', NULL, '')
ON DUPLICATE KEY UPDATE
  `menu_name` = VALUES(`menu_name`), `parent_id` = VALUES(`parent_id`), `order_num` = VALUES(`order_num`),
  `path` = VALUES(`path`), `component` = VALUES(`component`), `menu_type` = VALUES(`menu_type`),
  `visible` = VALUES(`visible`), `status` = VALUES(`status`), `perms` = VALUES(`perms`),
  `icon` = VALUES(`icon`), `update_by` = 'admin', `update_time` = sysdate(), `remark` = VALUES(`remark`);

-- 商家角色可管理自己的商品；服务层和 SQL 始终附带当前 merchant_id。
INSERT INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT r.`role_id`, p.`menu_id`
FROM `sys_role` r
JOIN (SELECT 3003 AS menu_id UNION ALL SELECT 3300 UNION ALL SELECT 3301 UNION ALL SELECT 3302 UNION ALL SELECT 3303) p
WHERE r.`role_key` = 'merchant' AND r.`del_flag` = '0'
  AND NOT EXISTS (
    SELECT 1 FROM `sys_role_menu` rm WHERE rm.`role_id` = r.`role_id` AND rm.`menu_id` = p.`menu_id`
  );
