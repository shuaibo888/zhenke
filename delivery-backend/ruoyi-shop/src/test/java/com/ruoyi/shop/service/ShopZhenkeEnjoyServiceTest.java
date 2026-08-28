package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkeEnjoyComment;
import com.ruoyi.shop.domain.ShopPlace;
import com.ruoyi.shop.domain.dto.ShopZhenkeCommentBody;
import com.ruoyi.shop.domain.dto.ShopZhenkeEnjoyBody;
import com.ruoyi.shop.domain.dto.ShopZhenkePostBody;
import com.ruoyi.shop.mapper.ShopZhenkeEnjoyMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
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

class ShopZhenkeEnjoyServiceTest {
  @TempDir Path tempDirectory;

  private String previousProfile;
  private final ShopZhenkeEnjoyMapper mapper = mock(ShopZhenkeEnjoyMapper.class);
  private final ShopZhenkeService placeService = mock(ShopZhenkeService.class);
  private final ShopZhenkeEnjoyService service = new ShopZhenkeEnjoyService(mapper, placeService);

  @BeforeEach
  void setUpStoredImage() throws Exception {
    previousProfile = RuoYiConfig.getProfile();
    new RuoYiConfig().setProfile(tempDirectory.toString());
    Path file = tempDirectory.resolve("upload/banner/cover.jpg");
    Files.createDirectories(file.getParent());
    ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "jpg", file.toFile());
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
    new RuoYiConfig().setProfile(previousProfile);
  }

  @Test
  void publicListOnlyRequestsPublishedContentAndNormalizesCategory() {
    when(mapper.selectEnjoys(any(), any(), any(), anyBoolean(), any())).thenReturn(List.of());

    assertTrue(service.enjoys(" restaurant ", 1, 12).isEmpty());

    verify(mapper).selectEnjoys("RESTAURANT", null, null, false, null);
    assertThrows(ServiceException.class, () -> service.enjoys("POST", 1, 12));
  }

  @Test
  void adminSavePersistsOfficialContentWithoutAnyPostRelationship() {
    ShopZhenkeEnjoyBody body = body();
    when(placeService.resolveSelectedPlace(body.getPlace())).thenReturn(place());
    when(mapper.insertEnjoy(any(ShopZhenkeEnjoy.class)))
        .thenAnswer(
            invocation -> {
              ((ShopZhenkeEnjoy) invocation.getArgument(0)).setEnjoyId(31L);
              return 1;
            });
    ShopZhenkeEnjoy saved = new ShopZhenkeEnjoy();
    saved.setEnjoyId(31L);
    when(mapper.selectEnjoy(31L, true, null)).thenReturn(saved);
    when(mapper.selectMediaUrls(31L))
        .thenReturn(List.of("/profile/upload/banner/cover.jpg"));
    when(mapper.insertMedia(anyLong(), anyString(), anyInt())).thenReturn(1);

    assertEquals(31L, service.save(null, body, "admin").getEnjoyId());

    var captor = org.mockito.ArgumentCaptor.forClass(ShopZhenkeEnjoy.class);
    verify(mapper).insertEnjoy(captor.capture());
    assertEquals("RESTAURANT", captor.getValue().getCategory());
    assertEquals("平台精选饭店", captor.getValue().getTitle());
    assertEquals(41L, captor.getValue().getPlaceId());
    assertEquals("服务端确认地点", captor.getValue().getPlaceName());
    assertEquals("/profile/upload/banner/cover.jpg", captor.getValue().getCoverUrl());
    assertEquals("admin", captor.getValue().getCreateBy());
    verify(mapper).insertMedia(31L, "/profile/upload/banner/cover.jpg", 1);
  }

  @Test
  void officialGalleryRejectsArbitraryOrCredentialedExternalUrls() {
    ShopZhenkeEnjoyBody insecure = body();
    when(placeService.resolveSelectedPlace(any())).thenReturn(place());
    insecure.setMediaUrls(List.of("http://cdn.example.com/cover.jpg"));
    assertThrows(ServiceException.class, () -> service.save(null, insecure, "admin"));

    ShopZhenkeEnjoyBody credentialed = body();
    credentialed.setMediaUrls(List.of("https://user:secret@cdn.example.com/cover.jpg"));
    assertThrows(ServiceException.class, () -> service.save(null, credentialed, "admin"));
    verify(mapper, never()).insertEnjoy(any());
  }

  @Test
  void publishingRequiresAResolvedPlaceGalleryAndRequiredContent() {
    when(mapper.countPublishReady(31L)).thenReturn(0, 1);
    assertThrows(ServiceException.class, () -> service.updateStatus(31L, "0", "admin"));

    when(mapper.updateEnjoyStatus(31L, "0", "admin")).thenReturn(1);
    assertDoesNotThrow(() -> service.updateStatus(31L, "0", "admin"));
  }

  @Test
  void userCanToggleLikeOnPublishedOfficialContent() {
    authenticateShopUser(18L);
    ShopZhenkeEnjoy published = new ShopZhenkeEnjoy();
    published.setEnjoyId(7L);
    published.setLikeCount(4);
    when(mapper.selectEnjoy(7L, false, 18L)).thenReturn(published);
    when(mapper.countLike(7L, 18L)).thenReturn(0, 1);
    when(mapper.insertLike(7L, 18L)).thenReturn(1);

    Map<String, Object> result = service.toggleLike(7L);

    assertEquals(true, result.get("liked"));
    assertEquals(4, result.get("likeCount"));
    verify(mapper).insertLike(7L, 18L);
  }

  @Test
  void concurrentLikeInsertReturnsThePersistedState() {
    authenticateShopUser(18L);
    ShopZhenkeEnjoy published = new ShopZhenkeEnjoy();
    published.setEnjoyId(8L);
    published.setLikeCount(5);
    when(mapper.selectEnjoy(8L, false, 18L)).thenReturn(published);
    when(mapper.countLike(8L, 18L)).thenReturn(0, 1);
    when(mapper.insertLike(8L, 18L)).thenReturn(0);

    Map<String, Object> result = service.toggleLike(8L);

    assertEquals(true, result.get("liked"));
    assertEquals(5, result.get("likeCount"));
    verify(mapper).insertLike(8L, 18L);
  }

  @Test
  void likeStillFailsWhenNoRelationWasPersisted() {
    authenticateShopUser(18L);
    ShopZhenkeEnjoy published = new ShopZhenkeEnjoy();
    published.setEnjoyId(10L);
    when(mapper.selectEnjoy(10L, false, 18L)).thenReturn(published);
    when(mapper.countLike(10L, 18L)).thenReturn(0);
    when(mapper.insertLike(10L, 18L)).thenReturn(0);

    assertThrows(ServiceException.class, () -> service.toggleLike(10L));
  }

  @Test
  void commentFailsWhenOfficialContentStopsBeingPublicBeforeInsert() {
    authenticateShopUser(18L);
    ShopZhenkeEnjoy published = new ShopZhenkeEnjoy();
    published.setEnjoyId(9L);
    when(mapper.selectEnjoy(9L, false, 18L)).thenReturn(published);
    when(mapper.insertComment(any())).thenReturn(0);
    ShopZhenkeCommentBody body = new ShopZhenkeCommentBody();
    body.setContent("刚刚下线的内容不能继续评论");

    assertThrows(ServiceException.class, () -> service.comment(9L, body));
  }

  @Test
  void repliesAttachToRootAndUsersOnlyDeleteTheirOwnComments() {
    authenticateShopUser(18L);
    ShopZhenkeEnjoy published = new ShopZhenkeEnjoy();
    published.setEnjoyId(7L);
    when(mapper.selectEnjoy(7L, false, 18L)).thenReturn(published);
    ShopZhenkeEnjoyComment replyTarget = new ShopZhenkeEnjoyComment();
    replyTarget.setCommentId(12L);
    replyTarget.setParentCommentId(10L);
    when(mapper.selectComment(7L, 12L)).thenReturn(replyTarget);
    when(mapper.insertComment(any()))
        .thenAnswer(
            invocation -> {
              ((ShopZhenkeEnjoyComment) invocation.getArgument(0)).setCommentId(13L);
              return 1;
            });
    ShopZhenkeEnjoyComment saved = new ShopZhenkeEnjoyComment();
    saved.setCommentId(13L);
    when(mapper.selectComment(7L, 13L)).thenReturn(saved);
    ShopZhenkeCommentBody body = new ShopZhenkeCommentBody();
    body.setContent("回复内容");
    body.setReplyToCommentId(12L);

    service.comment(7L, body);

    var captor = org.mockito.ArgumentCaptor.forClass(ShopZhenkeEnjoyComment.class);
    verify(mapper).insertComment(captor.capture());
    assertEquals(10L, captor.getValue().getParentCommentId());
    assertEquals(18L, captor.getValue().getShopUserId());

    when(mapper.deleteComment(7L, 13L, 18L)).thenReturn(0);
    assertThrows(ServiceException.class, () -> service.deleteComment(7L, 13L));
  }

  private ShopZhenkeEnjoyBody body() {
    ShopZhenkeEnjoyBody body = new ShopZhenkeEnjoyBody();
    body.setCategory(" restaurant ");
    body.setTitle(" 平台精选饭店 ");
    body.setSubtitle("今日推荐");
    body.setServiceSummary("包含停车与到店咨询服务");
    body.setMediaUrls(
        List.of("http://127.0.0.1:8080/api/profile/upload/banner/cover.jpg"));
    ShopZhenkePostBody.PlaceSelection selection = new ShopZhenkePostBody.PlaceSelection();
    selection.setProvider("TENCENT");
    selection.setProviderPlaceId("poi-41");
    selection.setName("不可信的表单地点");
    selection.setAddress("不可信的表单地址");
    selection.setLatitude(java.math.BigDecimal.valueOf(38.5));
    selection.setLongitude(java.math.BigDecimal.valueOf(115.0));
    body.setPlace(selection);
    body.setContent("平台编辑发布的完整推荐内容");
    body.setStatus("1");
    body.setDisplaySort(0);
    return body;
  }

  private ShopPlace place() {
    ShopPlace place = new ShopPlace();
    place.setPlaceId(41L);
    place.setProvider("TENCENT");
    place.setProviderPlaceId("poi-41");
    place.setPlaceName("服务端确认地点");
    place.setAddress("定州市中山路 88 号");
    place.setLatitude(java.math.BigDecimal.valueOf(38.5));
    place.setLongitude(java.math.BigDecimal.valueOf(115.0));
    return place;
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
}
