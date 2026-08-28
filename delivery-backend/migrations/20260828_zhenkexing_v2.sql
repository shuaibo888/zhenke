-- 甄客行 V2 增量迁移：超管甄必享内容与无限库存
-- 前置条件：已执行 20260826_zhenkexing_v1.sql。
-- 执行方式：由使用方在本地或生产 MySQL 8 环境人工执行；应用启动不会自动执行本脚本。
-- 可重复执行：新表使用 IF NOT EXISTS，字段通过 information_schema 判断，菜单与权限按唯一语义去重。

SET NAMES utf8mb4;
SET @db = DATABASE();

-- 甄必享是平台官方内容，不与用户甄客帖共表，也不允许用户发布。
CREATE TABLE IF NOT EXISTS shop_zhenke_enjoy (
  enjoy_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '甄必享内容ID',
  category VARCHAR(24) NOT NULL COMMENT 'MALL/RESTAURANT/SCENIC/HOTEL',
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(240) DEFAULT NULL,
  cover_url VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  highlights VARCHAR(500) DEFAULT NULL COMMENT '推荐亮点，以换行或分隔符录入',
  place_name VARCHAR(160) DEFAULT NULL,
  place_address VARCHAR(500) DEFAULT NULL,
  display_sort INT NOT NULL DEFAULT 0,
  status CHAR(1) NOT NULL DEFAULT '1' COMMENT '0发布 1下线',
  del_flag CHAR(1) NOT NULL DEFAULT '0',
  published_at DATETIME DEFAULT NULL,
  create_by VARCHAR(64) DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by VARCHAR(64) DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (enjoy_id),
  KEY idx_ze_public (category,status,del_flag,display_sort,published_at),
  KEY idx_ze_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄必享官方精选内容';

CREATE TABLE IF NOT EXISTS shop_zhenke_enjoy_like (
  enjoy_id BIGINT NOT NULL,
  shop_user_id BIGINT NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (enjoy_id,shop_user_id),
  KEY idx_zel_user (shop_user_id,create_time),
  CONSTRAINT fk_zel_enjoy FOREIGN KEY (enjoy_id) REFERENCES shop_zhenke_enjoy(enjoy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄必享用户点赞';

CREATE TABLE IF NOT EXISTS shop_zhenke_enjoy_comment (
  comment_id BIGINT NOT NULL AUTO_INCREMENT,
  enjoy_id BIGINT NOT NULL,
  parent_comment_id BIGINT DEFAULT NULL,
  reply_to_comment_id BIGINT DEFAULT NULL,
  shop_user_id BIGINT NOT NULL,
  content VARCHAR(500) NOT NULL,
  del_flag CHAR(1) NOT NULL DEFAULT '0',
  delete_time DATETIME DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id),
  KEY idx_zec_enjoy (enjoy_id,del_flag,create_time),
  KEY idx_zec_parent (parent_comment_id),
  CONSTRAINT fk_zec_enjoy FOREIGN KEY (enjoy_id) REFERENCES shop_zhenke_enjoy(enjoy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄必享用户评论与回复';

-- 新增字段时先以 0 回填存量商品，保持已有有限库存语义；随后仅把新行的数据库默认值改为 1。
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='stock_unlimited')=0,
  'ALTER TABLE shop_product ADD COLUMN stock_unlimited CHAR(1) NOT NULL DEFAULT ''0'' COMMENT ''0有限库存 1无限库存'' AFTER stock',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

-- 超管甄必享管理菜单及独立动作权限；只授权 admin，商家角色不可见且接口无权访问。
INSERT INTO sys_menu(menu_name,parent_id,order_num,path,component,route_name,is_frame,is_cache,menu_type,visible,status,perms,icon,create_by,create_time,remark)
SELECT '甄必享管理',0,72,'zhenke-enjoys',NULL,'ZhenkeEnjoys',1,0,'C','0','0','shop:enjoy:list','star','migration',NOW(),'甄必享官方内容仅超管运营'
WHERE NOT EXISTS(SELECT 1 FROM sys_menu WHERE perms='shop:enjoy:list');
SET @enjoy_menu=(SELECT menu_id FROM sys_menu WHERE perms='shop:enjoy:list' ORDER BY menu_id LIMIT 1);
INSERT INTO sys_menu(menu_name,parent_id,order_num,path,is_frame,is_cache,menu_type,visible,status,perms,icon,create_by,create_time)
SELECT p.n,@enjoy_menu,p.o,'#',1,0,'F','0','0',p.perm,'#','migration',NOW() FROM (
 SELECT '甄必享详情' n,1 o,'shop:enjoy:query' perm UNION ALL
 SELECT '甄必享新增',2,'shop:enjoy:add' UNION ALL
 SELECT '甄必享修改',3,'shop:enjoy:edit' UNION ALL
 SELECT '甄必享删除',4,'shop:enjoy:remove' UNION ALL
 SELECT '甄必享发布下线',5,'shop:enjoy:status'
) p WHERE NOT EXISTS(SELECT 1 FROM sys_menu m WHERE m.perms=p.perm);
INSERT IGNORE INTO sys_role_menu(role_id,menu_id)
SELECT r.role_id,m.menu_id FROM sys_role r JOIN sys_menu m ON m.perms IN
('shop:enjoy:list','shop:enjoy:query','shop:enjoy:add','shop:enjoy:edit','shop:enjoy:remove','shop:enjoy:status')
WHERE r.role_key='admin';

SET @s = IF(
  COALESCE((SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_product' AND COLUMN_NAME='stock_unlimited'), '')<>'1',
  'ALTER TABLE shop_product ALTER COLUMN stock_unlimited SET DEFAULT ''1''',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

-- 执行后核对：stock_unlimited 的 COLUMN_DEFAULT 应为 1。
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='shop_product' AND COLUMN_NAME='stock_unlimited'
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 执行后核对：应返回 3 张甄必享表，且权限只属于 admin 角色。
SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN
('shop_zhenke_enjoy','shop_zhenke_enjoy_like','shop_zhenke_enjoy_comment');
SELECT r.role_key,m.perms FROM sys_role_menu rm JOIN sys_role r ON r.role_id=rm.role_id JOIN sys_menu m ON m.menu_id=rm.menu_id
WHERE m.perms LIKE 'shop:enjoy:%';
