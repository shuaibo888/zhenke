package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkeEnjoyComment;
import com.ruoyi.shop.domain.dto.ShopZhenkeCommentBody;
import com.ruoyi.shop.domain.dto.ShopZhenkeEnjoyBody;
import com.ruoyi.shop.mapper.ShopZhenkeEnjoyMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopZhenkeEnjoyServiceTest {
  private final ShopZhenkeEnjoyMapper mapper = mock(ShopZhenkeEnjoyMapper.class);
  private final ShopZhenkeEnjoyService service = new ShopZhenkeEnjoyService(mapper);

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
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
    when(mapper.insertEnjoy(any(ShopZhenkeEnjoy.class)))
        .thenAnswer(
            invocation -> {
              ((ShopZhenkeEnjoy) invocation.getArgument(0)).setEnjoyId(31L);
              return 1;
            });
    ShopZhenkeEnjoy saved = new ShopZhenkeEnjoy();
    saved.setEnjoyId(31L);
    when(mapper.selectEnjoy(31L, true, null)).thenReturn(saved);

    assertEquals(31L, service.save(null, body, "admin").getEnjoyId());

    var captor = org.mockito.ArgumentCaptor.forClass(ShopZhenkeEnjoy.class);
    verify(mapper).insertEnjoy(captor.capture());
    assertEquals("RESTAURANT", captor.getValue().getCategory());
    assertEquals("平台精选饭店", captor.getValue().getTitle());
    assertEquals("admin", captor.getValue().getCreateBy());
  }

  @Test
  void officialCoverRejectsInsecureOrCredentialedExternalUrls() {
    ShopZhenkeEnjoyBody insecure = body();
    insecure.setCoverUrl("http://cdn.example.com/cover.jpg");
    assertThrows(ServiceException.class, () -> service.save(null, insecure, "admin"));

    ShopZhenkeEnjoyBody credentialed = body();
    credentialed.setCoverUrl("https://user:secret@cdn.example.com/cover.jpg");
    assertThrows(ServiceException.class, () -> service.save(null, credentialed, "admin"));
    verify(mapper, never()).insertEnjoy(any());
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
    body.setCoverUrl("/profile/upload/banner/cover.jpg");
    body.setContent("平台编辑发布的完整推荐内容");
    body.setStatus("1");
    body.setDisplaySort(0);
    return body;
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
