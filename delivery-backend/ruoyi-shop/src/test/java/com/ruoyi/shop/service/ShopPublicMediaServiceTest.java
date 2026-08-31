package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.shop.domain.ShopHomeBanner;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.ShopZhenkePostResource;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShopPublicMediaServiceTest {
  @Test
  void qualifiesOnlyPersistedPlatformMediaPaths() {
    ServerConfig serverConfig = mock(ServerConfig.class);
    when(serverConfig.getUrl()).thenReturn("https://dzshop.vip");
    ShopPublicMediaService service = new ShopPublicMediaService(serverConfig);
    ShopZhenkePost post = new ShopZhenkePost();
    post.setAvatar("/profile/avatar/me.png");
    ShopZhenkePostResource local = new ShopZhenkePostResource();
    local.setResourceUrl("/profile/upload/report/user-18/photo.png");
    ShopZhenkePostResource remote = new ShopZhenkePostResource();
    remote.setResourceUrl("https://cdn.example/photo.png");
    post.setResources(List.of(local, remote));
    ShopHomeBanner banner = new ShopHomeBanner();
    banner.setImageUrl("/profile/upload/banner.png");

    service.post(post);
    service.banner(banner);

    assertEquals("https://dzshop.vip/profile/avatar/me.png", post.getAvatar());
    assertEquals(
        "https://dzshop.vip/profile/upload/report/user-18/photo.png",
        local.getResourceUrl());
    assertEquals("https://cdn.example/photo.png", remote.getResourceUrl());
    assertEquals("https://dzshop.vip/profile/upload/banner.png", banner.getImageUrl());
  }

  @Test
  void publicViewsExcludeLifecycleAndOperatorAuditFields() throws Exception {
    ServerConfig serverConfig = mock(ServerConfig.class);
    when(serverConfig.getUrl()).thenReturn("https://dzshop.vip");
    ShopPublicMediaService service = new ShopPublicMediaService(serverConfig);
    ShopHomeBanner banner = new ShopHomeBanner();
    banner.setTitle("公开轮播");
    banner.setImageUrl("/profile/upload/banner.png");
    banner.setStatus("0");
    banner.setCreateBy("operator-secret");
    ShopZhenkeEnjoy enjoy = new ShopZhenkeEnjoy();
    enjoy.setTitle("公开精选");
    enjoy.setCoverUrl("/profile/upload/enjoy.png");
    enjoy.setStatus("0");
    enjoy.setDelFlag("0");
    enjoy.setCreateBy("operator-secret");

    var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
    String payload =
        mapper.writeValueAsString(
            List.of(service.publicBanners(List.of(banner)), service.publicEnjoy(enjoy)));

    assertTrue(payload.contains("公开轮播"));
    assertTrue(payload.contains("公开精选"));
    assertFalse(payload.contains("operator-secret"));
    assertFalse(payload.contains("createBy"));
    assertFalse(payload.contains("delFlag"));
    assertFalse(payload.contains("status"));
  }
}
