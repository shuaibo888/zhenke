-- 甄客行第一版增量迁移（MySQL 8.0+）
-- 重要：本脚本由运维人工执行；Cloud 未连接数据库、未执行迁移。
-- 执行前：完整备份；确认 shop_user/shop_merchant/shop_product/shop_product_category/sys_menu 存在；在测试库演练。
-- 执行后：执行文末核对查询，确认三类稳定代码唯一、表及索引存在、商家角色未获得内容治理权限。
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS shop_place (
  place_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '地点ID',
  provider VARCHAR(32) NOT NULL COMMENT '地图提供方',
  provider_place_id VARCHAR(128) NOT NULL COMMENT '提供方稳定地点ID',
  place_name VARCHAR(160) NOT NULL,
  place_type VARCHAR(64) DEFAULT NULL,
  address VARCHAR(500) NOT NULL,
  province VARCHAR(64) DEFAULT NULL, city VARCHAR(64) DEFAULT NULL, district VARCHAR(64) DEFAULT NULL,
  province_code VARCHAR(16) DEFAULT NULL, city_code VARCHAR(16) DEFAULT NULL, district_code VARCHAR(16) DEFAULT NULL,
  latitude DECIMAL(10,6) NOT NULL, longitude DECIMAL(10,6) NOT NULL,
  coordinate_system VARCHAR(16) NOT NULL DEFAULT 'GCJ02',
  status CHAR(1) NOT NULL DEFAULT '0' COMMENT '0正常 1停用',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (place_id), UNIQUE KEY uk_shop_place_provider (provider, provider_place_id),
  KEY idx_shop_place_city (city_code, status), KEY idx_shop_place_name (place_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄客行地点';

CREATE TABLE IF NOT EXISTS shop_zhenke_post (
  post_id BIGINT NOT NULL AUTO_INCREMENT, shop_user_id BIGINT NOT NULL,
  title VARCHAR(120) NOT NULL, content TEXT NOT NULL, suggestion VARCHAR(1000) DEFAULT NULL,
  perspective VARCHAR(24) NOT NULL COMMENT 'LOCAL/TOURIST/HOMETOWNER',
  place_id BIGINT NOT NULL, place_name VARCHAR(160) NOT NULL, place_address VARCHAR(500) NOT NULL,
  place_province VARCHAR(64) DEFAULT NULL, place_city VARCHAR(64) DEFAULT NULL, place_district VARCHAR(64) DEFAULT NULL,
  place_latitude DECIMAL(10,6) NOT NULL, place_longitude DECIMAL(10,6) NOT NULL,
  merchant_id BIGINT DEFAULT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED', published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  del_flag CHAR(1) NOT NULL DEFAULT '0', deleted_by BIGINT DEFAULT NULL,
  delete_source VARCHAR(16) DEFAULT NULL, delete_time DATETIME DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id), KEY idx_zp_public (del_flag,status,published_at),
  KEY idx_zp_author (shop_user_id,del_flag,published_at), KEY idx_zp_place (place_id,del_flag),
  KEY idx_zp_merchant (merchant_id,del_flag), CONSTRAINT fk_zp_place FOREIGN KEY (place_id) REFERENCES shop_place(place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄客帖';

CREATE TABLE IF NOT EXISTS shop_zhenke_post_resource (
  resource_id BIGINT NOT NULL AUTO_INCREMENT, post_id BIGINT NOT NULL,
  resource_type VARCHAR(12) NOT NULL COMMENT 'IMAGE/VIDEO', resource_url VARCHAR(500) NOT NULL,
  resource_sort INT NOT NULL DEFAULT 0, create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(resource_id), KEY idx_zpr_post(post_id,resource_sort),
  CONSTRAINT fk_zpr_post FOREIGN KEY(post_id) REFERENCES shop_zhenke_post(post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄客帖媒体';

CREATE TABLE IF NOT EXISTS shop_zhenke_upload (
  upload_id BIGINT NOT NULL AUTO_INCREMENT,
  shop_user_id BIGINT NOT NULL,
  resource_url VARCHAR(500) NOT NULL,
  resource_type VARCHAR(12) NOT NULL COMMENT 'IMAGE/VIDEO',
  claimed_post_id BIGINT DEFAULT NULL,
  expire_time DATETIME NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claim_time DATETIME DEFAULT NULL,
  PRIMARY KEY(upload_id),
  UNIQUE KEY uk_zhenke_upload_url(resource_url),
  KEY idx_zhenke_upload_owner(shop_user_id,claimed_post_id,expire_time),
  CONSTRAINT fk_zhenke_upload_post FOREIGN KEY(claimed_post_id) REFERENCES shop_zhenke_post(post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄客帖上传归属与一次性认领';

CREATE TABLE IF NOT EXISTS shop_zhenke_post_comment (
  comment_id BIGINT NOT NULL AUTO_INCREMENT, post_id BIGINT NOT NULL,
  parent_comment_id BIGINT DEFAULT NULL, reply_to_comment_id BIGINT DEFAULT NULL,
  shop_user_id BIGINT NOT NULL, content VARCHAR(500) NOT NULL,
  del_flag CHAR(1) NOT NULL DEFAULT '0', delete_time DATETIME DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(comment_id), KEY idx_zpc_post(post_id,del_flag,create_time), KEY idx_zpc_parent(parent_comment_id),
  CONSTRAINT fk_zpc_post FOREIGN KEY(post_id) REFERENCES shop_zhenke_post(post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄客帖评论回复';

CREATE TABLE IF NOT EXISTS shop_zhenke_post_useful (
  post_id BIGINT NOT NULL, shop_user_id BIGINT NOT NULL, create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id,shop_user_id), KEY idx_zpu_user(shop_user_id),
  CONSTRAINT fk_zpu_post FOREIGN KEY(post_id) REFERENCES shop_zhenke_post(post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄客帖有用关系';

CREATE TABLE IF NOT EXISTS shop_home_banner (
  banner_id BIGINT NOT NULL AUTO_INCREMENT, title VARCHAR(120) NOT NULL, subtitle VARCHAR(240) DEFAULT NULL,
  image_url VARCHAR(500) NOT NULL, jump_type VARCHAR(16) NOT NULL COMMENT 'INTERNAL/EXTERNAL',
  jump_target VARCHAR(500) NOT NULL, banner_sort INT NOT NULL DEFAULT 0, status CHAR(1) NOT NULL DEFAULT '0',
  start_time DATETIME DEFAULT NULL, end_time DATETIME DEFAULT NULL,
  create_by VARCHAR(64) DEFAULT NULL, create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by VARCHAR(64) DEFAULT NULL, update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(banner_id), KEY idx_banner_active(status,start_time,end_time,banner_sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄客行首页轮播';

-- MySQL 8 的 ADD COLUMN IF NOT EXISTS 在部分小版本不可用，使用 information_schema + 动态 SQL 保证可重复执行。
SET @db = DATABASE();
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='package_content')=0,
 'ALTER TABLE shop_product ADD COLUMN package_content TEXT NULL COMMENT ''套餐内容'' AFTER detail','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='usage_notice')=0,
 'ALTER TABLE shop_product ADD COLUMN usage_notice TEXT NULL COMMENT ''使用须知'' AFTER package_content','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='validity_description')=0,
 'ALTER TABLE shop_product ADD COLUMN validity_description VARCHAR(500) NULL COMMENT ''有效期说明'' AFTER usage_notice','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='reservation_required')=0,
 'ALTER TABLE shop_product ADD COLUMN reservation_required CHAR(1) NOT NULL DEFAULT ''0'' COMMENT ''是否预约'' AFTER validity_description','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='reservation_notice')=0,
 'ALTER TABLE shop_product ADD COLUMN reservation_notice VARCHAR(500) NULL COMMENT ''预约说明'' AFTER reservation_required','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='refund_expiry_rule')=0,
 'ALTER TABLE shop_product ADD COLUMN refund_expiry_rule VARCHAR(1000) NULL COMMENT ''退款及过期规则'' AFTER reservation_notice','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

INSERT INTO shop_product_category(category_code,category_name,category_sort,status,create_by,create_time,update_by,update_time)
SELECT 'ZHENKE_HOTEL','甄客酒店',10,'0','migration',NOW(),'migration',NOW()
WHERE NOT EXISTS(SELECT 1 FROM shop_product_category WHERE category_code='ZHENKE_HOTEL');
INSERT INTO shop_product_category(category_code,category_name,category_sort,status,create_by,create_time,update_by,update_time)
SELECT 'ZHENKE_RESTAURANT','甄客饭店',20,'0','migration',NOW(),'migration',NOW()
WHERE NOT EXISTS(SELECT 1 FROM shop_product_category WHERE category_code='ZHENKE_RESTAURANT');
INSERT INTO shop_product_category(category_code,category_name,category_sort,status,create_by,create_time,update_by,update_time)
SELECT 'ZHENKE_SCENIC','甄客景区',30,'0','migration',NOW(),'migration',NOW()
WHERE NOT EXISTS(SELECT 1 FROM shop_product_category WHERE category_code='ZHENKE_SCENIC');

-- 超管菜单与按钮权限：只绑定管理员角色；绝不向商家角色批量授权。
INSERT INTO sys_menu(menu_name,parent_id,order_num,path,component,query,route_name,is_frame,is_cache,menu_type,visible,status,perms,icon,create_by,create_time,remark)
SELECT '甄客帖管理',0,70,'zhenke-posts',NULL,NULL,'ZhenkePosts',1,0,'C','0','0','shop:zhenkePost:list','documentation','migration',NOW(),'甄客帖仅超管治理'
WHERE NOT EXISTS(SELECT 1 FROM sys_menu WHERE perms='shop:zhenkePost:list');
SET @post_menu=(SELECT menu_id FROM sys_menu WHERE perms='shop:zhenkePost:list' ORDER BY menu_id LIMIT 1);
INSERT INTO sys_menu(menu_name,parent_id,order_num,path,is_frame,is_cache,menu_type,visible,status,perms,icon,create_by,create_time)
SELECT '甄客帖删除',@post_menu,1,'#',1,0,'F','0','0','shop:zhenkePost:remove','#','migration',NOW()
WHERE NOT EXISTS(SELECT 1 FROM sys_menu WHERE perms='shop:zhenkePost:remove');
INSERT INTO sys_menu(menu_name,parent_id,order_num,path,component,route_name,is_frame,is_cache,menu_type,visible,status,perms,icon,create_by,create_time,remark)
SELECT '首页轮播管理',0,71,'home-banners',NULL,'HomeBanners',1,0,'C','0','0','shop:banner:list','picture','migration',NOW(),'首页轮播仅超管运营'
WHERE NOT EXISTS(SELECT 1 FROM sys_menu WHERE perms='shop:banner:list');
SET @banner_menu=(SELECT menu_id FROM sys_menu WHERE perms='shop:banner:list' ORDER BY menu_id LIMIT 1);
INSERT INTO sys_menu(menu_name,parent_id,order_num,path,is_frame,is_cache,menu_type,visible,status,perms,icon,create_by,create_time)
SELECT p.n,@banner_menu,p.o,'#',1,0,'F','0','0',p.perm,'#','migration',NOW() FROM (
 SELECT '轮播新增' n,1 o,'shop:banner:add' perm UNION ALL SELECT '轮播修改',2,'shop:banner:edit'
 UNION ALL SELECT '轮播删除',3,'shop:banner:remove' UNION ALL SELECT '轮播启停',4,'shop:banner:status'
) p WHERE NOT EXISTS(SELECT 1 FROM sys_menu m WHERE m.perms=p.perm);
INSERT IGNORE INTO sys_role_menu(role_id,menu_id)
SELECT r.role_id,m.menu_id FROM sys_role r JOIN sys_menu m ON m.perms IN
('shop:zhenkePost:list','shop:zhenkePost:remove','shop:banner:list','shop:banner:add','shop:banner:edit','shop:banner:remove','shop:banner:status')
WHERE r.role_key='admin';

-- 执行后只读核对
SELECT category_code,category_name,status FROM shop_product_category WHERE category_code IN ('ZHENKE_HOTEL','ZHENKE_RESTAURANT','ZHENKE_SCENIC');
SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN
('shop_place','shop_zhenke_post','shop_zhenke_post_resource','shop_zhenke_upload','shop_zhenke_post_comment','shop_zhenke_post_useful','shop_home_banner');
SELECT r.role_key,m.perms FROM sys_role_menu rm JOIN sys_role r ON r.role_id=rm.role_id JOIN sys_menu m ON m.menu_id=rm.menu_id
WHERE m.perms LIKE 'shop:zhenkePost:%' OR m.perms LIKE 'shop:banner:%';
