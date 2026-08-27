package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopHomeBanner;
import com.ruoyi.shop.domain.ShopPlace;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.dto.ShopHomeBannerBody;
import com.ruoyi.shop.domain.dto.ShopZhenkePostBody;
import com.ruoyi.shop.map.TencentMapService;
import com.ruoyi.shop.mapper.ShopZhenkeMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopZhenkeServiceTest {
  private final ShopZhenkeMapper mapper = mock(ShopZhenkeMapper.class);
  private final TencentMapService mapService = mock(TencentMapService.class);

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void zonesNeverAcceptOrForwardDeviceCity() {
    when(mapper.selectPosts(
            anyString(), isNull(), isNull(), isNull(), isNull(), isNull(), eq(false), isNull()))
        .thenReturn(List.of());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    service.posts("LOCAL", null, 1, 12);

    verify(mapper).selectPosts("LOCAL", null, null, null, null, null, false, null);
    assertThrows(ServiceException.class, () -> service.posts("HANDAN", null, 1, 12));
  }

  @Test
  void uploadedMediaIsRegisteredAgainstCurrentUserAndMustBeLocal() {
    authenticateShopUser(18L);
    when(mapper.insertPendingUpload(anyLong(), anyString(), anyString())).thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertEquals(
        "/profile/upload/2026/08/photo.png",
        service.registerUpload("/profile/upload/2026/08/photo.png", "photo.png"));
    verify(mapper).insertPendingUpload(18L, "/profile/upload/2026/08/photo.png", "IMAGE");
    assertThrows(
        ServiceException.class,
        () -> service.registerUpload("https://attacker.example/photo.png", "photo.png"));
  }

  @Test
  void adminStatusFilterRejectsUnknownStates() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");
    assertThrows(
        ServiceException.class, () -> service.adminPosts("", null, "PENDING_REVIEW", 1, 20));
  }

  @Test
  void publishingPersistsProviderPlaceAndClaimsCurrentUsersUpload() {
    authenticateShopUser(18L);
    ShopZhenkePostBody body = postBody();
    when(mapper.selectPlaceByProvider("TENCENT", "poi-100")).thenReturn(null);
    when(mapService.placeDetail("poi-100"))
        .thenReturn(
            Map.ofEntries(
                Map.entry("providerPlaceId", "poi-100"),
                Map.entry("placeName", "服务端地点"),
                Map.entry("placeType", "文化场馆"),
                Map.entry("address", "服务端地址"),
                Map.entry("province", "上海市"),
                Map.entry("city", "上海市"),
                Map.entry("district", "黄浦区"),
                Map.entry("provinceCode", "310000"),
                Map.entry("cityCode", "310100"),
                Map.entry("districtCode", "310101"),
                Map.entry("latitude", new BigDecimal("31.230416")),
                Map.entry("longitude", new BigDecimal("121.473701"))));
    when(mapper.insertPlace(any(ShopPlace.class)))
        .thenAnswer(
            invocation -> {
              ((ShopPlace) invocation.getArgument(0)).setPlaceId(5L);
              return 1;
            });
    when(mapper.insertPost(any(ShopZhenkePost.class)))
        .thenAnswer(
            invocation -> {
              ((ShopZhenkePost) invocation.getArgument(0)).setPostId(44L);
              return 1;
            });
    when(mapper.claimPendingUpload(18L, "/profile/upload/photo.png", "IMAGE", 44L)).thenReturn(1);
    ShopZhenkePost saved = new ShopZhenkePost();
    saved.setPostId(44L);
    when(mapper.selectPost(44L, false, 18L)).thenReturn(saved);
    when(mapper.selectResources(44L)).thenReturn(List.of());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertEquals(44L, service.publish(body).getPostId());

    var place = org.mockito.ArgumentCaptor.forClass(ShopPlace.class);
    verify(mapper).insertPlace(place.capture());
    assertEquals("服务端地点", place.getValue().getPlaceName());
    assertEquals("服务端地址", place.getValue().getAddress());
    verify(mapper).claimPendingUpload(18L, "/profile/upload/photo.png", "IMAGE", 44L);
  }

  @Test
  void externalBannerRequiresHttpsAndServerAllowList() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "trusted.example.com");
    assertThrows(
        ServiceException.class,
        () ->
            service.saveBanner(null, banner("http://trusted.example.com/x", "EXTERNAL"), "admin"));
    assertThrows(
        ServiceException.class,
        () -> service.saveBanner(null, banner("https://evil.example/x", "EXTERNAL"), "admin"));

    when(mapper.insertBanner(any()))
        .thenAnswer(
            invocation -> {
              ((ShopHomeBanner) invocation.getArgument(0)).setBannerId(1L);
              return 1;
            });
    when(mapper.selectBanner(1L)).thenReturn(new ShopHomeBanner());
    assertNotNull(
        service.saveBanner(null, banner("https://trusted.example.com/x", "EXTERNAL"), "admin"));
  }

  @Test
  void activeBannerDelegatesToEffectiveWindowQuery() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");
    when(mapper.selectActiveBanners()).thenReturn(List.of());
    assertTrue(service.activeBanners().isEmpty());
    verify(mapper).selectActiveBanners();
  }

  private void authenticateShopUser(long userId) {
    SysUser user = new SysUser();
    user.setPhonenumber("13800000000");
    LoginUser principal =
        new LoginUser(
            ShopAccountIdentity.toPrincipalId(userId),
            null,
            user,
            Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
  }

  private ShopHomeBannerBody banner(String target, String type) {
    ShopHomeBannerBody body = new ShopHomeBannerBody();
    body.setTitle("标题");
    body.setImageUrl("https://cdn.example/a.jpg");
    body.setJumpType(type);
    body.setJumpTarget(target);
    body.setStatus("0");
    body.setBannerSort(1);
    return body;
  }

  private ShopZhenkePostBody postBody() {
    ShopZhenkePostBody body = new ShopZhenkePostBody();
    body.setTitle("标题");
    body.setContent("正文");
    body.setPerspective("LOCAL");
    ShopZhenkePostBody.PlaceSelection place = new ShopZhenkePostBody.PlaceSelection();
    place.setProvider("TENCENT");
    place.setProviderPlaceId("poi-100");
    place.setName("不可信前端地点");
    place.setAddress("不可信前端地址");
    place.setLatitude(BigDecimal.ZERO);
    place.setLongitude(BigDecimal.ZERO);
    body.setPlace(place);
    ShopZhenkePostBody.Resource resource = new ShopZhenkePostBody.Resource();
    resource.setResourceType("IMAGE");
    resource.setResourceUrl("/profile/upload/photo.png");
    body.setResources(List.of(resource));
    return body;
  }
}
