package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ruoyi.common.exception.ServiceException;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShopZhenkeHomeServiceTest {
  private final ShopZhenkeService postService = mock(ShopZhenkeService.class);
  private final ShopZhenkeEnjoyService enjoyService = mock(ShopZhenkeEnjoyService.class);
  private final ShopPublicMediaService publicMedia = mock(ShopPublicMediaService.class);
  private final ShopZhenkeCityScopeService cityScope = mock(ShopZhenkeCityScopeService.class);
  private final ShopZhenkeHomeService service =
      new ShopZhenkeHomeService(postService, enjoyService, publicMedia, cityScope);

  @Test
  void homepageUsesOneCityResolutionAndOneQueryPerContentGroup() {
    when(cityScope.resolvePublicFeedCity("保定市")).thenReturn("保定市");
    when(postService.homePosts("保定市", 9)).thenReturn(List.of());
    when(postService.activeBanners()).thenReturn(List.of());
    when(enjoyService.homeEnjoys("保定市", 2)).thenReturn(List.of());
    when(publicMedia.posts(List.of())).thenReturn(List.of());
    when(publicMedia.publicBanners(List.of())).thenReturn(List.of());
    when(publicMedia.publicEnjoys(List.of())).thenReturn(List.of());

    var result = service.load("保定市");

    assertNull(result.postError());
    assertNull(result.bannerError());
    assertNull(result.enjoyError());
    assertEquals(List.of("MALL", "RESTAURANT", "SCENIC", "HOTEL"),
        result.enjoys().keySet().stream().toList());
    verify(cityScope).resolvePublicFeedCity("保定市");
    verify(postService).homePosts("保定市", 9);
    verify(postService).activeBanners();
    verify(enjoyService).homeEnjoys("保定市", 2);
  }

  @Test
  void missingRequiredCityKeepsBannersButDoesNotFallBackToGlobalContent() {
    when(cityScope.resolvePublicFeedCity(null))
        .thenThrow(new ServiceException("请先定位或手动选择城市"));
    when(postService.activeBanners()).thenReturn(List.of());
    when(publicMedia.publicBanners(List.of())).thenReturn(List.of());

    var result = service.load(null);

    assertEquals("请先定位或手动选择城市", result.postError());
    assertEquals("请先定位或手动选择城市", result.enjoyError());
    verify(postService, never()).homePosts(null, 9);
    verify(enjoyService, never()).homeEnjoys(null, 2);
    verify(postService).activeBanners();
  }
}
