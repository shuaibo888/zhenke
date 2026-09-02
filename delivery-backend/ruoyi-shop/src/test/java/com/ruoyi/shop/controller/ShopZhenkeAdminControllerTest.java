package com.ruoyi.shop.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class ShopZhenkeAdminControllerTest {
  @Test
  void zhenkeGovernanceRequiresAdminRoleAndSeparateActionPermissions() throws Exception {
    PreAuthorize controllerGuard = ShopZhenkeAdminController.class.getAnnotation(PreAuthorize.class);
    assertEquals("@ss.hasRole('admin')", controllerGuard.value());

    assertPermission("posts", "shop:zhenkePost:list", String.class, Long.class, String.class, String.class,
        java.util.Date.class, java.util.Date.class, int.class, int.class);
    assertPermission("post", "shop:zhenkePost:query", long.class);
    assertPermission("delete", "shop:zhenkePost:remove", long.class);
    assertPermission("featurePost", "shop:zhenkePost:feature", long.class);
    assertPermission("unfeaturePost", "shop:zhenkePost:feature", long.class);
    assertPermission("banners", "shop:banner:list");
    assertPermission("add", "shop:banner:add", com.ruoyi.shop.domain.dto.ShopHomeBannerBody.class);
    assertPermission("edit", "shop:banner:edit", long.class, com.ruoyi.shop.domain.dto.ShopHomeBannerBody.class);
    assertPermission("remove", "shop:banner:remove", long.class);
    assertPermission("status", "shop:banner:status", long.class, String.class);
    assertPermission("enjoys", "shop:enjoy:list", String.class, String.class, String.class,
        int.class, int.class);
    assertPermission("enjoy", "shop:enjoy:query", long.class);
    assertPermission("addEnjoy", "shop:enjoy:add", com.ruoyi.shop.domain.dto.ShopZhenkeEnjoyBody.class);
    assertPermission("editEnjoy", "shop:enjoy:edit", long.class,
        com.ruoyi.shop.domain.dto.ShopZhenkeEnjoyBody.class);
    assertPermission("removeEnjoy", "shop:enjoy:remove", long.class);
    assertPermission("enjoyStatus", "shop:enjoy:status", long.class, String.class);
  }

  private void assertPermission(String methodName, String permission, Class<?>... parameterTypes)
      throws Exception {
    Method method = ShopZhenkeAdminController.class.getMethod(methodName, parameterTypes);
    assertEquals(
        "@ss.hasRole('admin') and @ss.hasPermi('" + permission + "')",
        method.getAnnotation(PreAuthorize.class).value());
  }
}
