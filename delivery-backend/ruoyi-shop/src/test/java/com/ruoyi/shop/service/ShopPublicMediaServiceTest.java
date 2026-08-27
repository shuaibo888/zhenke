package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.shop.domain.ShopHomeBanner;
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
}
