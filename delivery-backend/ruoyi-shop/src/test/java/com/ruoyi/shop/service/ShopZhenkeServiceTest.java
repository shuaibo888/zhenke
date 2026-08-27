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
import com.ruoyi.shop.domain.ShopZhenkePostComment;
import com.ruoyi.shop.domain.dto.ShopHomeBannerBody;
import com.ruoyi.shop.domain.dto.ShopZhenkeCommentBody;
import com.ruoyi.shop.domain.dto.ShopZhenkePostBody;
import com.ruoyi.shop.map.TencentMapService;
import com.ruoyi.shop.mapper.ShopZhenkeMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.math.BigDecimal;
import java.util.Date;
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
            anyString(), isNull(), isNull(), isNull(), isNull(), isNull(), eq(false), isNull(), isNull(), isNull()))
        .thenReturn(List.of());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    service.posts("LOCAL", null, 1, 12);

    verify(mapper).selectPosts("LOCAL", null, null, null, null, null, false, null, null, null);
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
        ServiceException.class,
        () -> service.adminPosts("", null, "PENDING_REVIEW", null, null, 1, 20));
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
    when(mapper.claimPendingUpload(
            18L, "/profile/upload/report/user-18/photo.png", "IMAGE", 44L))
        .thenReturn(1);
    when(mapper.insertResource(any())).thenReturn(1);
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
    verify(mapper)
        .claimPendingUpload(18L, "/profile/upload/report/user-18/photo.png", "IMAGE", 44L);
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
  void internalBannerRejectsNetworkPathEscapesAndInsecureImages() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertThrows(
        ServiceException.class,
        () -> service.saveBanner(null, banner("/\\evil.example/path", "INTERNAL"), "admin"));
    assertThrows(
        ServiceException.class,
        () -> service.saveBanner(null, banner("/%2f%2fevil.example/path", "INTERNAL"), "admin"));

    ShopHomeBannerBody insecureImage = banner("/posts", "INTERNAL");
    insecureImage.setImageUrl("http://cdn.example/banner.jpg");
    assertThrows(ServiceException.class, () -> service.saveBanner(null, insecureImage, "admin"));
  }

  @Test
  void bannerInsertMustPersistAndReturnSavedRecord() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");
    ShopHomeBannerBody body = banner("/posts", "INTERNAL");
    when(mapper.insertBanner(any())).thenReturn(0);

    assertThrows(ServiceException.class, () -> service.saveBanner(null, body, "admin"));

    when(mapper.insertBanner(any()))
        .thenAnswer(
            invocation -> {
              ((ShopHomeBanner) invocation.getArgument(0)).setBannerId(9L);
              return 1;
            });
    when(mapper.selectBanner(9L)).thenReturn(null);
    assertThrows(ServiceException.class, () -> service.saveBanner(null, body, "admin"));
  }

  @Test
  void activeBannerDelegatesToEffectiveWindowQuery() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");
    when(mapper.selectActiveBanners()).thenReturn(List.of());
    assertTrue(service.activeBanners().isEmpty());
    verify(mapper).selectActiveBanners();
  }

  @Test
  void publishingRequiresAuthenticatedShopUser() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertThrows(ServiceException.class, () -> service.publish(postBody()));
    verify(mapper, never()).insertPost(any());
  }

  @Test
  void videoOnlyPostCanBePublishedAndClaimsVideoUpload() {
    authenticateShopUser(18L);
    ShopZhenkePostBody body = postBody();
    body.getResources().get(0).setResourceType("VIDEO");
    body.getResources().get(0).setResourceUrl("/profile/upload/report/user-18/clip.mp4");
    stubExistingPlaceAndSavedPost(18L, 45L);
    when(mapper.claimPendingUpload(
            18L, "/profile/upload/report/user-18/clip.mp4", "VIDEO", 45L))
        .thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertEquals(45L, service.publish(body).getPostId());
    verify(mapper)
        .claimPendingUpload(18L, "/profile/upload/report/user-18/clip.mp4", "VIDEO", 45L);
  }

  @Test
  void publishingAcceptsPublicUploadUrlButClaimsItsPersistedPlatformPath() {
    authenticateShopUser(18L);
    ShopZhenkePostBody body = postBody();
    body.getResources().get(0).setResourceUrl(
        "https://dzshop.vip/profile/upload/report/user-18/photo.png");
    stubExistingPlaceAndSavedPost(18L, 46L);
    when(mapper.claimPendingUpload(
            18L, "/profile/upload/report/user-18/photo.png", "IMAGE", 46L))
        .thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertEquals(46L, service.publish(body).getPostId());
    verify(mapper)
        .claimPendingUpload(18L, "/profile/upload/report/user-18/photo.png", "IMAGE", 46L);
  }

  @Test
  void publishingRejectsInactiveMerchantAssociation() {
    authenticateShopUser(18L);
    ShopZhenkePostBody body = postBody();
    body.setMerchantId(99L);
    ShopPlace place = existingPlace();
    when(mapper.selectPlaceByProvider("TENCENT", "poi-100")).thenReturn(place);
    when(mapper.countActiveMerchant(99L)).thenReturn(0);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertThrows(ServiceException.class, () -> service.publish(body));
    verify(mapper, never()).insertPost(any());
  }

  @Test
  void usefulToggleRemovesExistingVoteWithoutCreatingDuplicate() {
    authenticateShopUser(18L);
    ShopZhenkePost post = savedPost(66L);
    post.setUsefulCount(4);
    when(mapper.selectPost(66L, false, 18L)).thenReturn(post);
    when(mapper.countUseful(66L, 18L)).thenReturn(1, 0);
    when(mapper.deleteUseful(66L, 18L)).thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    Map<String, Object> result = service.toggleUseful(66L);

    assertEquals(false, result.get("useful"));
    verify(mapper).deleteUseful(66L, 18L);
    verify(mapper, never()).insertUseful(anyLong(), anyLong());
  }

  @Test
  void usefulToggleReturnsPersistedStateWhenConcurrentInsertAlreadyWon() {
    authenticateShopUser(18L);
    ShopZhenkePost post = savedPost(67L);
    post.setUsefulCount(5);
    when(mapper.selectPost(67L, false, 18L)).thenReturn(post);
    when(mapper.countUseful(67L, 18L)).thenReturn(0, 1);
    when(mapper.insertUseful(67L, 18L)).thenReturn(0);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    Map<String, Object> result = service.toggleUseful(67L);

    assertEquals(true, result.get("useful"));
    verify(mapper).insertUseful(67L, 18L);
  }

  @Test
  void repliesAlwaysAttachToTheRootComment() {
    authenticateShopUser(18L);
    when(mapper.selectPost(70L, false, 18L)).thenReturn(savedPost(70L));
    ShopZhenkePostComment target = new ShopZhenkePostComment();
    target.setCommentId(12L);
    target.setParentCommentId(10L);
    when(mapper.selectComment(70L, 12L)).thenReturn(target);
    when(mapper.insertComment(any()))
        .thenAnswer(
            invocation -> {
              ((ShopZhenkePostComment) invocation.getArgument(0)).setCommentId(13L);
              return 1;
            });
    ShopZhenkePostComment saved = new ShopZhenkePostComment();
    saved.setCommentId(13L);
    when(mapper.selectComment(70L, 13L)).thenReturn(saved);
    ShopZhenkeCommentBody body = new ShopZhenkeCommentBody();
    body.setContent("回复内容");
    body.setReplyToCommentId(12L);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    service.comment(70L, body);

    var captor = org.mockito.ArgumentCaptor.forClass(ShopZhenkePostComment.class);
    verify(mapper).insertComment(captor.capture());
    assertEquals(10L, captor.getValue().getParentCommentId());
    assertEquals(12L, captor.getValue().getReplyToCommentId());
    assertEquals(18L, captor.getValue().getShopUserId());
  }

  @Test
  void deletingRootCommentUsesOwnedTreeDeleteAndRejectsForeignComment() {
    authenticateShopUser(18L);
    ShopZhenkePostComment root = new ShopZhenkePostComment();
    root.setCommentId(20L);
    when(mapper.selectComment(70L, 20L)).thenReturn(root);
    when(mapper.deleteCommentTree(70L, 20L, 18L)).thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    service.deleteComment(70L, 20L);
    verify(mapper).deleteCommentTree(70L, 20L, 18L);

    ShopZhenkePostComment reply = new ShopZhenkePostComment();
    reply.setCommentId(21L);
    reply.setParentCommentId(20L);
    when(mapper.selectComment(70L, 21L)).thenReturn(reply);
    when(mapper.deleteComment(70L, 21L, 18L)).thenReturn(0);
    assertThrows(ServiceException.class, () -> service.deleteComment(70L, 21L));
  }

  @Test
  void authorAndAdminDeletionRequireAnActualStateChange() {
    authenticateShopUser(18L);
    when(mapper.deleteOwnPost(77L, 18L)).thenReturn(1);
    when(mapper.adminDeletePost(78L, 900L)).thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    service.deleteOwn(77L);
    service.adminDelete(78L, 900L);

    when(mapper.deleteOwnPost(79L, 18L)).thenReturn(0);
    when(mapper.adminDeletePost(80L, 900L)).thenReturn(0);
    assertThrows(ServiceException.class, () -> service.deleteOwn(79L));
    assertThrows(ServiceException.class, () -> service.adminDelete(80L, 900L));
  }

  @Test
  void adminFiltersForwardMerchantStatusAndPublishedWindow() {
    Date from = new Date(1_000L);
    Date to = new Date(2_000L);
    when(mapper.selectPosts(anyString(), any(), any(), any(), any(), any(), anyBoolean(), any(), any(), any()))
        .thenReturn(List.of());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    service.adminPosts("关键词", 9L, "published", from, to, 1, 20);

    verify(mapper).selectPosts("RECOMMEND", null, null, "关键词", 9L, "PUBLISHED", true, from, to, null);
  }

  @Test
  void adminFiltersRejectInvalidMerchantAndPublishedWindow() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService, "");

    assertThrows(
        ServiceException.class,
        () -> service.adminPosts("", 0L, "", null, null, 1, 20));
    assertThrows(
        ServiceException.class,
        () -> service.adminPosts("", null, "", new Date(2_000L), new Date(1_000L), 1, 20));
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

  private void stubExistingPlaceAndSavedPost(long userId, long postId) {
    when(mapper.selectPlaceByProvider("TENCENT", "poi-100")).thenReturn(existingPlace());
    when(mapper.insertPost(any(ShopZhenkePost.class)))
        .thenAnswer(
            invocation -> {
              ((ShopZhenkePost) invocation.getArgument(0)).setPostId(postId);
              return 1;
            });
    when(mapper.selectPost(postId, false, userId)).thenReturn(savedPost(postId));
    when(mapper.selectResources(postId)).thenReturn(List.of());
    when(mapper.insertResource(any())).thenReturn(1);
  }

  private ShopPlace existingPlace() {
    ShopPlace place = new ShopPlace();
    place.setPlaceId(5L);
    place.setProvider("TENCENT");
    place.setProviderPlaceId("poi-100");
    place.setPlaceName("服务端地点");
    place.setAddress("服务端地址");
    place.setLatitude(new BigDecimal("31.230416"));
    place.setLongitude(new BigDecimal("121.473701"));
    return place;
  }

  private ShopZhenkePost savedPost(long postId) {
    ShopZhenkePost post = new ShopZhenkePost();
    post.setPostId(postId);
    return post;
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
    resource.setResourceUrl("/profile/upload/report/user-18/photo.png");
    body.setResources(List.of(resource));
    return body;
  }
}
