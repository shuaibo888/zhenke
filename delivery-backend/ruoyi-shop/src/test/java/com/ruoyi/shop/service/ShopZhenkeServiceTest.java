package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopHomeBanner;
import com.ruoyi.shop.domain.ShopPlace;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.ShopZhenkePostComment;
import com.ruoyi.shop.domain.ShopZhenkePostResource;
import com.ruoyi.shop.domain.dto.ShopHomeBannerBody;
import com.ruoyi.shop.domain.dto.ShopZhenkeCommentBody;
import com.ruoyi.shop.domain.dto.ShopZhenkePostBody;
import com.ruoyi.shop.domain.vo.ShopMerchantOption;
import com.ruoyi.shop.map.TencentMapService;
import com.ruoyi.shop.mapper.ShopZhenkeMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.math.BigDecimal;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopZhenkeServiceTest {
  @TempDir Path tempDirectory;

  private String previousProfile;
  private final ShopZhenkeMapper mapper = mock(ShopZhenkeMapper.class);
  private final TencentMapService mapService = mock(TencentMapService.class);

  @BeforeEach
  void setUpStoredMedia() throws Exception {
    previousProfile = RuoYiConfig.getProfile();
    new RuoYiConfig().setProfile(tempDirectory.toString());
    writeImage("upload/banner/a.jpg", "jpg");
    writeImage("upload/report/user-18/photo.png", "png");
    writeImage("upload/report/user-18/2026/08/photo.png", "png");
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
    new RuoYiConfig().setProfile(previousProfile);
  }

  @Test
  void perspectiveAndCityFiltersAreForwardedAsIndependentPostMetadata() {
    when(mapper.selectPosts(
            anyString(), isNull(), isNull(), isNull(), isNull(), isNull(), eq(false), isNull(), isNull(), isNull(), any()))
        .thenReturn(List.of());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    service.posts("LOCAL", null, " 保定市 ", 1, 12);
    service.posts("TOURIST", null, 1, 12);
    service.posts("HOMETOWNER", null, 1, 12);

    verify(mapper).selectPosts("LOCAL", null, null, null, null, null, false, null, null, null, "保定市");
    verify(mapper).selectPosts("TOURIST", null, null, null, null, null, false, null, null, null, null);
    verify(mapper).selectPosts("HOMETOWNER", null, null, null, null, null, false, null, null, null, null);
    assertThrows(ServiceException.class, () -> service.posts("HANDAN", null, 1, 12));
  }

  @Test
  void publishedCityFacetAndSelectedCityRemainIndependentFromPerspective() {
    when(mapper.selectPostCities("LOCAL", "保定市")).thenReturn(List.of("保定市"));
    when(mapper.selectPosts(
            eq("TOURIST"), isNull(), isNull(), isNull(), isNull(), isNull(), eq(false),
            isNull(), isNull(), isNull(), eq("邯郸市")))
        .thenReturn(List.of());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    assertEquals(List.of("保定市"), service.postCities("LOCAL", " 保定市 "));
    service.posts("TOURIST", null, null, " 邯郸市 ", 1, 12);

    verify(mapper).selectPosts(
        "TOURIST", null, null, null, null, null, false, null, null, null, "邯郸市");
    verify(mapper, never()).selectPosts(
        eq("LOCAL"), any(), any(), any(), any(), any(), anyBoolean(), any(), any(), any(), any());
  }

  @Test
  void postListsHydrateAllMediaWithOneBatchQuery() {
    ShopZhenkePost first = savedPost(11L);
    ShopZhenkePost second = savedPost(12L);
    ShopZhenkePostResource firstImage = new ShopZhenkePostResource();
    firstImage.setPostId(11L);
    firstImage.setResourceUrl("/profile/upload/report/user-18/first.jpg");
    ShopZhenkePostResource secondImage = new ShopZhenkePostResource();
    secondImage.setPostId(12L);
    secondImage.setResourceUrl("/profile/upload/report/user-18/second.jpg");
    when(mapper.selectPosts(
            eq("RECOMMEND"), isNull(), isNull(), isNull(), isNull(), isNull(), eq(false),
            isNull(), isNull(), isNull(), isNull()))
        .thenReturn(List.of(first, second));
    when(mapper.selectResourcesByPostIds(List.of(11L, 12L)))
        .thenReturn(List.of(firstImage, secondImage));
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    List<ShopZhenkePost> result = service.posts("RECOMMEND", null, 1, 12);

    assertEquals(List.of(firstImage), result.get(0).getResources());
    assertEquals(List.of(secondImage), result.get(1).getResources());
    verify(mapper).selectResourcesByPostIds(List.of(11L, 12L));
    verify(mapper, never()).selectResources(anyLong());
  }

  @Test
  void uploadedMediaIsRegisteredAgainstCurrentUserAndMustBeLocal() {
    authenticateShopUser(18L);
    when(mapper.insertPendingUpload(anyLong(), anyString(), anyString())).thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    assertEquals(
        "/profile/upload/report/user-18/2026/08/photo.png",
        service.registerUpload(
            "http://127.0.0.1:8080/api/profile/upload/report/user-18/2026/08/photo.png",
            "photo.png"));
    verify(mapper)
        .insertPendingUpload(
            18L, "/profile/upload/report/user-18/2026/08/photo.png", "IMAGE");
    assertThrows(
        ServiceException.class,
        () -> service.registerUpload("https://attacker.example/photo.png", "photo.png"));
  }

  @Test
  void adminStatusFilterRejectsUnknownStates() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);
    assertThrows(
        ServiceException.class,
        () -> service.adminPosts("", null, "PENDING_REVIEW", null, null, 1, 20));
  }

  @Test
  void merchantOptionsDiscardIncompleteRows() {
    ShopMerchantOption valid = new ShopMerchantOption();
    valid.setMerchantId(9L);
    valid.setShopName("甄客商家");
    ShopMerchantOption missingName = new ShopMerchantOption();
    missingName.setMerchantId(10L);
    List<ShopMerchantOption> rows = new ArrayList<>();
    rows.add(null);
    rows.add(missingName);
    rows.add(valid);
    when(mapper.selectActiveMerchantOptions("")).thenReturn(rows);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    assertEquals(List.of(valid), service.merchantOptions(""));
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
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    assertEquals(44L, service.publish(body).getPostId());

    var place = org.mockito.ArgumentCaptor.forClass(ShopPlace.class);
    verify(mapper).insertPlace(place.capture());
    assertEquals("服务端地点", place.getValue().getPlaceName());
    assertEquals("服务端地址", place.getValue().getAddress());
    var post = org.mockito.ArgumentCaptor.forClass(ShopZhenkePost.class);
    verify(mapper).insertPost(post.capture());
    verify(mapper)
        .claimPendingUpload(18L, "/profile/upload/report/user-18/photo.png", "IMAGE", 44L);
  }

  @Test
  void externalBannerRequiresACompleteHttpsUrl() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);
    assertThrows(
        ServiceException.class,
        () ->
            service.saveBanner(null, banner("http://trusted.example.com/x", "EXTERNAL"), "admin"));
    assertThrows(
        ServiceException.class,
        () -> service.saveBanner(null, banner("https:///missing-host", "EXTERNAL"), "admin"));
    assertThrows(
        ServiceException.class,
        () -> service.saveBanner(null, banner("https://user:secret@example.com/x", "EXTERNAL"), "admin"));

    when(mapper.insertBanner(any()))
        .thenAnswer(
            invocation -> {
              ((ShopHomeBanner) invocation.getArgument(0)).setBannerId(1L);
              return 1;
            });
    when(mapper.selectBanner(1L)).thenReturn(new ShopHomeBanner());
    assertNotNull(service.saveBanner(null, banner("https://events.example.com/x", "EXTERNAL"), "admin"));
    var captor = org.mockito.ArgumentCaptor.forClass(ShopHomeBanner.class);
    verify(mapper).insertBanner(captor.capture());
    assertEquals("/profile/upload/banner/a.jpg", captor.getValue().getImageUrl());
    assertEquals("1", captor.getValue().getStatus());
  }

  @Test
  void editingBannerPreservesPersistedStatus() {
    ShopHomeBanner existing = new ShopHomeBanner();
    existing.setBannerId(7L);
    existing.setStatus("0");
    when(mapper.selectBanner(7L)).thenReturn(existing);
    when(mapper.updateBanner(any())).thenReturn(1);
    ShopHomeBannerBody body = banner("/posts", "INTERNAL");
    body.setStatus("1");
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    service.saveBanner(7L, body, "editor-only");

    var captor = org.mockito.ArgumentCaptor.forClass(ShopHomeBanner.class);
    verify(mapper).updateBanner(captor.capture());
    assertEquals("0", captor.getValue().getStatus());
  }

  @Test
  void bannerDatePayloadCanBeDeserialized() throws Exception {
    ShopHomeBannerBody body =
        new ObjectMapper()
            .findAndRegisterModules()
            .readValue(
                "{\"startTime\":\"2026-08-27\",\"endTime\":\"2026-08-27\"}",
                ShopHomeBannerBody.class);

    assertEquals(LocalDate.of(2026, 8, 27), body.getStartTime());
    assertEquals(LocalDate.of(2026, 8, 27), body.getEndTime());
  }

  @Test
  void bannerValidityIsStoredAsWholeCalendarDays() {
    ShopHomeBannerBody body = banner("/posts", "INTERNAL");
    ZoneId zone = ZoneId.systemDefault();
    body.setStartTime(LocalDate.of(2026, 8, 27));
    body.setEndTime(LocalDate.of(2026, 8, 27));
    when(mapper.insertBanner(any()))
        .thenAnswer(
            invocation -> {
              ((ShopHomeBanner) invocation.getArgument(0)).setBannerId(8L);
              return 1;
            });
    when(mapper.selectBanner(8L)).thenReturn(new ShopHomeBanner());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    service.saveBanner(null, body, "admin");

    var captor = org.mockito.ArgumentCaptor.forClass(ShopHomeBanner.class);
    verify(mapper).insertBanner(captor.capture());
    assertEquals(
        LocalDateTime.of(2026, 8, 27, 0, 0),
        captor.getValue().getStartTime().toInstant().atZone(zone).toLocalDateTime());
    assertEquals(
        LocalDateTime.of(2026, 8, 27, 23, 59, 59),
        captor.getValue().getEndTime().toInstant().atZone(zone).toLocalDateTime());
  }

  @Test
  void internalBannerRejectsNetworkPathEscapesAndInsecureImages() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

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
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);
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
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);
    when(mapper.selectActiveBanners()).thenReturn(List.of());
    assertTrue(service.activeBanners().isEmpty());
    verify(mapper).selectActiveBanners();
  }

  @Test
  void publishingRequiresAuthenticatedShopUser() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    assertThrows(ServiceException.class, () -> service.publish(postBody()));
    verify(mapper, never()).insertPost(any());
  }

  @Test
  void videoOnlyPostIsRejectedBeforePersistence() {
    authenticateShopUser(18L);
    ShopZhenkePostBody body = postBody();
    body.getResources().get(0).setResourceType("VIDEO");
    body.getResources().get(0).setResourceUrl("/profile/upload/report/user-18/clip.mp4");
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    ServiceException error = assertThrows(ServiceException.class, () -> service.publish(body));
    assertEquals("请至少上传一张图片作为封面", error.getMessage());
    verify(mapper, never()).insertPost(any());
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
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

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
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

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
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

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
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    Map<String, Object> result = service.toggleUseful(67L);

    assertEquals(true, result.get("useful"));
    verify(mapper).insertUseful(67L, 18L);
  }

  @Test
  void postAuthorCannotMarkOwnPostUseful() {
    authenticateShopUser(18L);
    ShopZhenkePost ownPost = savedPost(68L);
    ownPost.setShopUserId(18L);
    when(mapper.selectPost(68L, false, 18L)).thenReturn(ownPost);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    ServiceException error =
        assertThrows(ServiceException.class, () -> service.toggleUseful(68L));

    assertEquals("不能将自己的甄客帖标记为有用", error.getMessage());
    verify(mapper, never()).insertUseful(anyLong(), anyLong());
    verify(mapper, never()).deleteUseful(anyLong(), anyLong());
  }

  @Test
  void repliesDelegateRootResolutionToTheAtomicMapperInsert() {
    authenticateShopUser(18L);
    when(mapper.selectPost(70L, false, 18L)).thenReturn(savedPost(70L));
    when(mapper.insertComment(any()))
        .thenAnswer(
            invocation -> {
              ((ShopZhenkePostComment) invocation.getArgument(0)).setCommentId(13L);
              return 1;
            });
    ShopZhenkePostComment saved = new ShopZhenkePostComment();
    saved.setCommentId(13L);
    saved.setParentCommentId(10L);
    saved.setReplyToCommentId(12L);
    when(mapper.selectComment(70L, 13L)).thenReturn(saved);
    ShopZhenkeCommentBody body = new ShopZhenkeCommentBody();
    body.setContent("回复内容");
    body.setReplyToCommentId(12L);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    ShopZhenkePostComment result = service.comment(70L, body);

    var captor = org.mockito.ArgumentCaptor.forClass(ShopZhenkePostComment.class);
    verify(mapper).insertComment(captor.capture());
    assertNull(captor.getValue().getParentCommentId());
    assertEquals(12L, captor.getValue().getReplyToCommentId());
    assertEquals(18L, captor.getValue().getShopUserId());
    assertEquals(10L, result.getParentCommentId());
    verify(mapper, never()).selectComment(70L, 12L);
  }

  @Test
  void replyFailsWhenItsTargetIsDeletedBeforeTheAtomicInsert() {
    authenticateShopUser(18L);
    when(mapper.selectPost(70L, false, 18L)).thenReturn(savedPost(70L));
    when(mapper.insertComment(any())).thenReturn(0);
    ShopZhenkeCommentBody body = new ShopZhenkeCommentBody();
    body.setContent("并发删除后不能继续回复");
    body.setReplyToCommentId(12L);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    ServiceException error =
        assertThrows(ServiceException.class, () -> service.comment(70L, body));

    assertEquals("回复的评论不存在或已删除", error.getMessage());
    verify(mapper, never()).selectComment(anyLong(), anyLong());
  }

  @Test
  void commentFailsWhenPostIsDeletedBeforeInsert() {
    authenticateShopUser(18L);
    when(mapper.selectPost(71L, false, 18L)).thenReturn(savedPost(71L));
    when(mapper.insertComment(any())).thenReturn(0);
    ShopZhenkeCommentBody body = new ShopZhenkeCommentBody();
    body.setContent("删除中的帖子不能继续评论");
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    assertThrows(ServiceException.class, () -> service.comment(71L, body));
  }

  @Test
  void deletingRootCommentUsesOwnedTreeDeleteAndRejectsForeignComment() {
    authenticateShopUser(18L);
    ShopZhenkePostComment root = new ShopZhenkePostComment();
    root.setCommentId(20L);
    when(mapper.selectComment(70L, 20L)).thenReturn(root);
    when(mapper.deleteCommentTree(70L, 20L, 18L)).thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

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
  void commentPagesContainOnlyRootsAndABoundedReplyPreview() {
    when(mapper.selectPost(70L, false, null)).thenReturn(savedPost(70L));
    when(mapper.selectResources(70L)).thenReturn(List.of());
    ShopZhenkePostComment root = new ShopZhenkePostComment();
    root.setCommentId(20L);
    root.setReplyCount(8L);
    ShopZhenkePostComment reply = new ShopZhenkePostComment();
    reply.setCommentId(21L);
    reply.setParentCommentId(20L);
    when(mapper.selectRootComments(70L)).thenReturn(List.of(root));
    when(mapper.selectReplyPreviews(70L, List.of(20L), 3)).thenReturn(List.of(reply));
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    List<ShopZhenkePostComment> result = service.comments(70L, 1, 500);

    assertEquals(List.of(reply), result.get(0).getReplies());
    assertEquals(8L, result.get(0).getReplyCount());
    verify(mapper).selectReplyPreviews(70L, List.of(20L), 3);
  }

  @Test
  void repliesEndpointRejectsAReplyAsTheThreadRoot() {
    when(mapper.selectPost(70L, false, null)).thenReturn(savedPost(70L));
    when(mapper.selectResources(70L)).thenReturn(List.of());
    ShopZhenkePostComment reply = new ShopZhenkePostComment();
    reply.setCommentId(21L);
    reply.setParentCommentId(20L);
    when(mapper.selectComment(70L, 21L)).thenReturn(reply);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    assertThrows(ServiceException.class, () -> service.commentReplies(70L, 21L, 1, 20));
    verify(mapper, never()).selectReplies(anyLong(), anyLong());
  }

  @Test
  void authorAndAdminDeletionRequireAnActualStateChange() {
    authenticateShopUser(18L);
    when(mapper.deleteOwnPost(77L, 18L)).thenReturn(1);
    when(mapper.adminDeletePost(78L, 900L)).thenReturn(1);
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

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
    when(mapper.selectPosts(anyString(), any(), any(), any(), any(), any(), anyBoolean(), any(), any(), any(), any()))
        .thenReturn(List.of());
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

    service.adminPosts("关键词", 9L, "published", from, to, 1, 20);

    verify(mapper).selectPosts("RECOMMEND", null, null, "关键词", 9L, "PUBLISHED", true, from, to, null, null);
  }

  @Test
  void adminFiltersRejectInvalidMerchantAndPublishedWindow() {
    ShopZhenkeService service = new ShopZhenkeService(mapper, mapService);

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
    body.setImageUrl("http://127.0.0.1:8080/api/profile/upload/banner/a.jpg");
    body.setJumpType(type);
    body.setJumpTarget(target);
    body.setStatus("0");
    body.setBannerSort(1);
    return body;
  }

  private void writeImage(String relativePath, String format) throws Exception {
    Path file = tempDirectory.resolve(relativePath);
    Files.createDirectories(file.getParent());
    ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), format, file.toFile());
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
