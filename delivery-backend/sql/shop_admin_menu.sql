-- 商城管理权限。超级管理员自动拥有全部权限，其他角色可在若依角色管理中授权。

INSERT INTO sys_menu
  (menu_id, menu_name, parent_id, order_num, path, component, query, route_name,
   is_frame, is_cache, menu_type, visible, status, perms, icon,
   create_by, create_time, update_by, update_time, remark)
VALUES
  (3000, '商城管理', 0, 4, 'shop', NULL, '', '', 1, 0, 'M', '0', '0', '', 'shopping', 'admin', sysdate(), '', NULL, '商城业务管理目录'),
  (3001, '商城用户', 3000, 1, 'users', 'shop/users/index', '', '', 1, 0, 'C', '0', '0', 'shop:user:list', 'user', 'admin', sysdate(), '', NULL, '商城用户管理'),
  (3100, '商城用户查询', 3001, 1, '', '', '', '', 1, 0, 'F', '0', '0', 'shop:user:query', '#', 'admin', sysdate(), '', NULL, ''),
  (3101, '商城用户修改', 3001, 2, '', '', '', '', 1, 0, 'F', '0', '0', 'shop:user:edit', '#', 'admin', sysdate(), '', NULL, ''),
  (3102, '商城用户状态', 3001, 3, '', '', '', '', 1, 0, 'F', '0', '0', 'shop:user:status', '#', 'admin', sysdate(), '', NULL, '')
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name), parent_id = VALUES(parent_id), order_num = VALUES(order_num),
  path = VALUES(path), component = VALUES(component), menu_type = VALUES(menu_type),
  visible = VALUES(visible), status = VALUES(status), perms = VALUES(perms),
  icon = VALUES(icon), update_by = 'admin', update_time = sysdate(), remark = VALUES(remark);
