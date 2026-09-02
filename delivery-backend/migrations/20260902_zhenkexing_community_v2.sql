-- 甄客行精选甄客帖增量迁移（MySQL 8.0+）
-- 重要：本脚本由负责人在备份并完成测试库演练后人工执行；开发任务不执行数据库迁移。
-- 本脚本只扩展甄客帖精选和系统通知能力，不改变甄必享点赞及其历史数据语义。
SET NAMES utf8mb4;
SET @db = DATABASE();

-- MySQL 8 的 ADD COLUMN IF NOT EXISTS 在部分小版本不可用，使用 information_schema 保证可重复执行。
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_post' AND COLUMN_NAME='featured_flag')=0,
 'ALTER TABLE shop_zhenke_post ADD COLUMN featured_flag CHAR(1) NOT NULL DEFAULT ''0'' COMMENT ''是否编辑推荐：0否 1是'' AFTER status','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_post' AND COLUMN_NAME='featured_at')=0,
 'ALTER TABLE shop_zhenke_post ADD COLUMN featured_at DATETIME NULL COMMENT ''最近一次入选精选时间'' AFTER featured_flag','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_post' AND COLUMN_NAME='featured_by')=0,
 'ALTER TABLE shop_zhenke_post ADD COLUMN featured_by BIGINT NULL COMMENT ''最近一次精选操作的后台用户ID'' AFTER featured_at','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_post' AND COLUMN_NAME='featured_version')=0,
 'ALTER TABLE shop_zhenke_post ADD COLUMN featured_version BIGINT NOT NULL DEFAULT 0 COMMENT ''累计入选版本，用于系统消息去重'' AFTER featured_by','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

SET @s = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_post' AND INDEX_NAME='idx_zp_featured')=0,
 'ALTER TABLE shop_zhenke_post ADD INDEX idx_zp_featured (del_flag,status,featured_flag,featured_at,post_id)','SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

-- 系统消息没有 shop_user 发起人。保持原外键不变，仅放开空值，旧互动消息仍保留真实 actor。
SET @actor_column_type = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_notification' AND COLUMN_NAME='actor_shop_user_id' LIMIT 1);
SET @actor_nullable = (SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_notification' AND COLUMN_NAME='actor_shop_user_id' LIMIT 1);
SET @s = IF(@actor_nullable='NO',
 CONCAT('ALTER TABLE shop_notification MODIFY COLUMN actor_shop_user_id ',@actor_column_type,' NULL COMMENT ''互动发起用户ID；系统消息为空'''),
 'SELECT 1'); PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

-- 精选是甄客帖管理下的独立动作权限，只授权 admin 角色，不向商家角色授权。
SET @post_menu=(SELECT menu_id FROM sys_menu WHERE perms='shop:zhenkePost:list' ORDER BY menu_id LIMIT 1);
INSERT INTO sys_menu(menu_name,parent_id,order_num,path,is_frame,is_cache,menu_type,visible,status,perms,icon,create_by,create_time)
SELECT '甄客帖精选',@post_menu,3,'#',1,0,'F','0','0','shop:zhenkePost:feature','#','migration',NOW()
WHERE @post_menu IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM sys_menu WHERE perms='shop:zhenkePost:feature');
INSERT IGNORE INTO sys_role_menu(role_id,menu_id)
SELECT role.role_id,menu.menu_id
FROM sys_role role
JOIN sys_menu menu ON menu.perms='shop:zhenkePost:feature'
WHERE role.role_key='admin';

-- 执行后只读核对。
SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_zhenke_post'
  AND COLUMN_NAME IN ('featured_flag','featured_at','featured_by','featured_version')
ORDER BY ORDINAL_POSITION;
SELECT INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) index_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_zhenke_post' AND INDEX_NAME='idx_zp_featured'
GROUP BY INDEX_NAME;
SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shop_notification' AND COLUMN_NAME='actor_shop_user_id';
SELECT role.role_key,menu.perms
FROM sys_role_menu relation
JOIN sys_role role ON role.role_id=relation.role_id
JOIN sys_menu menu ON menu.menu_id=relation.menu_id
WHERE menu.perms='shop:zhenkePost:feature';
