-- 甄客行 V3 增量迁移：甄必享升级为官方地点专题
-- 前置条件：已执行 20260826_zhenkexing_v1.sql 与 20260828_zhenkexing_v2.sql。
-- 执行方式：由使用方在 MySQL 8 环境人工执行；应用不会自动执行本脚本。
-- 本脚本不修改 V1/V2 历史文件，不写入演示内容。

SET NAMES utf8mb4;
SET @db = DATABASE();

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_enjoy' AND COLUMN_NAME='place_id')=0,
  'ALTER TABLE shop_zhenke_enjoy ADD COLUMN place_id BIGINT NOT NULL COMMENT ''地图搜索选择的统一地点ID'' AFTER highlights',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_enjoy' AND COLUMN_NAME='service_summary')=0,
  'ALTER TABLE shop_zhenke_enjoy ADD COLUMN service_summary VARCHAR(1000) NOT NULL COMMENT ''首屏服务与推荐摘要'' AFTER cover_url',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

-- 甄必享尚未投产，不保留未选真实 POI 或缺失首屏摘要的旧结构。
ALTER TABLE shop_zhenke_enjoy
  MODIFY COLUMN place_id BIGINT NOT NULL COMMENT '地图搜索选择的统一地点ID',
  MODIFY COLUMN service_summary VARCHAR(1000) NOT NULL COMMENT '首屏服务与推荐摘要';

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_enjoy' AND COLUMN_NAME='opening_hours')=0,
  'ALTER TABLE shop_zhenke_enjoy ADD COLUMN opening_hours VARCHAR(160) DEFAULT NULL COMMENT ''营业或开放时间说明'' AFTER place_address',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_enjoy' AND COLUMN_NAME='contact_phone')=0,
  'ALTER TABLE shop_zhenke_enjoy ADD COLUMN contact_phone VARCHAR(40) DEFAULT NULL COMMENT ''公开联系电话'' AFTER opening_hours',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='shop_zhenke_enjoy' AND INDEX_NAME='idx_ze_place')=0,
  'ALTER TABLE shop_zhenke_enjoy ADD KEY idx_ze_place(place_id)',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA=@db AND TABLE_NAME='shop_zhenke_enjoy' AND CONSTRAINT_NAME='fk_ze_place')=0,
  'ALTER TABLE shop_zhenke_enjoy ADD CONSTRAINT fk_ze_place FOREIGN KEY (place_id) REFERENCES shop_place(place_id)',
  'SELECT 1'
);
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

CREATE TABLE IF NOT EXISTS shop_zhenke_enjoy_resource (
  resource_id BIGINT NOT NULL AUTO_INCREMENT,
  enjoy_id BIGINT NOT NULL,
  resource_url VARCHAR(500) NOT NULL,
  resource_sort INT NOT NULL DEFAULT 0,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (resource_id),
  KEY idx_zer_enjoy (enjoy_id,resource_sort,resource_id),
  CONSTRAINT fk_zer_enjoy FOREIGN KEY (enjoy_id) REFERENCES shop_zhenke_enjoy(enjoy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='甄必享官方地点专题图片';

-- 执行后核对：已发布内容必须同时具备统一地点、摘要和至少一张专题图片。
SELECT e.enjoy_id,e.title,e.status,e.place_id,e.service_summary,
       COUNT(r.resource_id) AS media_count
FROM shop_zhenke_enjoy e
LEFT JOIN shop_zhenke_enjoy_resource r ON r.enjoy_id=e.enjoy_id
GROUP BY e.enjoy_id,e.title,e.status,e.place_id,e.service_summary
ORDER BY e.enjoy_id;
