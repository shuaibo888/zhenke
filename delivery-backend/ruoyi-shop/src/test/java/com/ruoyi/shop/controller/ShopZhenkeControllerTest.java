package com.ruoyi.shop.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.service.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShopZhenkeControllerTest {
  private final ShopZhenkeService posts = mock(ShopZhenkeService.class);
  private final ShopZhenkeEnjoyService enjoys = mock(ShopZhenkeEnjoyService.class);
  private final ShopPublicMediaService media = mock(ShopPublicMediaService.class);
  private final ShopZhenkeCityScopeService scope = mock(ShopZhenkeCityScopeService.class);
  private final ShopZhenkeController controller =
      new ShopZhenkeController(posts, enjoys, null, media, null, scope, null, null);

  @Test
  void postCitiesRemainNationalWithOrWithoutLocation() {
    when(posts.postCities("LOCAL", null)).thenReturn(List.of("保定市", "北京市"));
    for (String city : new String[] {"北京市", null}) {
      assertEquals(List.of("保定市", "北京市"), controller.postCities("LOCAL", city).get("data"));
    }
    verifyNoInteractions(scope);
  }

  @Test
  void selectedCityAndPaginationWorkIndependentlyOfLocation() {
    List<ShopZhenkePost> rows = List.of(new ShopZhenkePost());
    when(posts.posts("LOCAL", null, null, "保定市", 2, 12)).thenReturn(rows);
    when(media.posts(rows)).thenReturn(rows);

    assertEquals(rows, controller.posts("LOCAL", null, "北京市", "保定市", 2, 12).getRows());
    verify(posts).posts("LOCAL", null, null, "保定市", 2, 12);
    verifyNoInteractions(scope);
  }

  @Test
  void enjoyListStillUsesConfiguredCityScope() {
    when(scope.resolvePublicFeedCity("北京市")).thenReturn("北京市");
    when(enjoys.enjoys("SCENIC", "北京市", 1, 12)).thenReturn(List.of());
    when(media.publicEnjoys(List.of())).thenReturn(List.of());

    controller.enjoys("SCENIC", "北京市", 1, 12);

    verify(enjoys).enjoys("SCENIC", "北京市", 1, 12);
    verify(scope).resolvePublicFeedCity("北京市");
  }
}
