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

    assertPermission("post", "@ss.hasPermi('shop:zhenkePost:query')", long.class);
    assertPermission("delete", "@ss.hasPermi('shop:zhenkePost:remove')", long.class);
    assertPermission("banners", "@ss.hasPermi('shop:banner:list')");
    assertPermission("add", "@ss.hasPermi('shop:banner:add')", com.ruoyi.shop.domain.dto.ShopHomeBannerBody.class);
    assertPermission("edit", "@ss.hasPermi('shop:banner:edit')", long.class, com.ruoyi.shop.domain.dto.ShopHomeBannerBody.class);
    assertPermission("remove", "@ss.hasPermi('shop:banner:remove')", long.class);
    assertPermission("status", "@ss.hasPermi('shop:banner:status')", long.class, String.class);
  }

  private void assertPermission(String methodName, String expected, Class<?>... parameterTypes)
      throws Exception {
    Method method = ShopZhenkeAdminController.class.getMethod(methodName, parameterTypes);
    assertEquals(expected, method.getAnnotation(PreAuthorize.class).value());
  }
}
