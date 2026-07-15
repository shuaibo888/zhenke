-- 商城用户与会员等级。执行前请确认当前数据库为 delivery_platform。

CREATE TABLE IF NOT EXISTS `shop_member_level` (
  `level_id` bigint NOT NULL AUTO_INCREMENT COMMENT '等级ID',
  `level_code` varchar(32) NOT NULL COMMENT '等级编码',
  `level_name` varchar(32) NOT NULL COMMENT '等级名称',
  `level_order` int NOT NULL DEFAULT 1 COMMENT '等级顺序',
  `badge_tone` varchar(20) DEFAULT NULL COMMENT '前端徽章色调',
  `is_default` char(1) NOT NULL DEFAULT '1' COMMENT '是否默认（0是 1否）',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '状态（0正常 1停用）',
  `create_by` varchar(64) NOT NULL DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) NOT NULL DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`level_id`),
  UNIQUE KEY `uk_shop_member_level_code` (`level_code`),
  UNIQUE KEY `uk_shop_member_level_order` (`level_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城会员等级';

INSERT INTO `shop_member_level`
  (`level_id`, `level_code`, `level_name`, `level_order`, `badge_tone`, `is_default`, `status`, `remark`)
VALUES
  (1, 'ZHENKE', '甄客', 1, 'silver', '0', '0', '注册后的默认等级'),
  (2, 'YANZHENKE', '验甄客', 2, 'gold', '1', '0', '进阶会员等级'),
  (3, 'XINZHENKE', '信甄客', 3, 'diamond', '1', '0', '高级会员等级')
ON DUPLICATE KEY UPDATE
  `level_name` = VALUES(`level_name`),
  `level_order` = VALUES(`level_order`),
  `badge_tone` = VALUES(`badge_tone`),
  `is_default` = VALUES(`is_default`),
  `status` = VALUES(`status`),
  `remark` = VALUES(`remark`);

CREATE TABLE IF NOT EXISTS `shop_user` (
  `user_id` bigint NOT NULL AUTO_INCREMENT COMMENT '商城用户ID',
  `user_name` varchar(30) NOT NULL COMMENT '登录账号',
  `nick_name` varchar(30) NOT NULL COMMENT '用户昵称',
  `password` varchar(100) NOT NULL COMMENT 'BCrypt密码',
  `phonenumber` varchar(11) DEFAULT NULL COMMENT '手机号码',
  `email` varchar(50) DEFAULT NULL COMMENT '邮箱',
  `avatar` varchar(500) DEFAULT NULL COMMENT '头像地址',
  `level_id` bigint NOT NULL DEFAULT 1 COMMENT '会员等级ID',
  `review_eligible` char(1) NOT NULL DEFAULT '0' COMMENT '可发布甄验报告（0是 1否）',
  `trial_eligible` char(1) NOT NULL DEFAULT '0' COMMENT '可申请试用（0是 1否）',
  `status` char(1) NOT NULL DEFAULT '0' COMMENT '账号状态（0正常 1停用）',
  `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0存在 2删除）',
  `login_ip` varchar(128) DEFAULT NULL COMMENT '最后登录IP',
  `login_date` datetime DEFAULT NULL COMMENT '最后登录时间',
  `pwd_update_date` datetime DEFAULT NULL COMMENT '密码更新时间',
  `create_by` varchar(64) NOT NULL DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(64) NOT NULL DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_shop_user_name` (`user_name`),
  UNIQUE KEY `uk_shop_user_phone` (`phonenumber`),
  UNIQUE KEY `uk_shop_user_email` (`email`),
  KEY `idx_shop_user_level_status` (`level_id`, `status`),
  CONSTRAINT `fk_shop_user_level` FOREIGN KEY (`level_id`) REFERENCES `shop_member_level` (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城用户';
