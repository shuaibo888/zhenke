package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.pagehelper.PageHelper;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopNotification;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportComment;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.ShopZhenkePostComment;
import com.ruoyi.shop.mapper.ShopNotificationMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopNotificationServiceTest
{
    private final ShopNotificationMapper mapper = mock(ShopNotificationMapper.class);
    private final ShopNotificationService service = new ShopNotificationService(mapper);

    @AfterEach
    void cleanUp()
    {
        SecurityContextHolder.clearContext();
        PageHelper.clearPage();
    }

    @Test
    void usefulNotificationUsesAStableDedupeKeyAndSkipsSelfNotification()
    {
        ShopZhenkePost post = new ShopZhenkePost();
        post.setPostId(41L);
        post.setShopUserId(9L);
        post.setTitle("城南面馆");

        service.postUseful(post, 8L);
        service.postUseful(post, 8L);

        ArgumentCaptor<ShopNotification> captor = ArgumentCaptor.forClass(ShopNotification.class);
        verify(mapper, org.mockito.Mockito.times(2)).insertNotification(captor.capture());
        List<ShopNotification> attempts = captor.getAllValues();
        assertEquals("POST_USEFUL:41:8:9", attempts.get(0).getDedupeKey());
        assertEquals(attempts.get(0).getDedupeKey(), attempts.get(1).getDedupeKey());
        assertEquals(9L, attempts.get(0).getRecipientShopUserId());

        reset(mapper);
        service.postUseful(post, 9L);
        verify(mapper, never()).insertNotification(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void featuredNotificationIsSystemGeneratedAndEachSelectionVersionIsDeliveredOnce()
    {
        ShopZhenkePost post = new ShopZhenkePost();
        post.setPostId(42L);
        post.setShopUserId(9L);
        post.setTitle("城南面馆");
        post.setFeaturedVersion(1L);

        service.postFeatured(post);
        post.setFeaturedVersion(2L);
        service.postFeatured(post);

        ArgumentCaptor<ShopNotification> captor = ArgumentCaptor.forClass(ShopNotification.class);
        verify(mapper, org.mockito.Mockito.times(2)).insertNotification(captor.capture());
        List<ShopNotification> attempts = captor.getAllValues();
        assertNull(attempts.get(0).getActorShopUserId());
        assertEquals(ShopNotificationService.POST_FEATURED, attempts.get(0).getEventType());
        assertEquals("POST_FEATURED:42:1:9", attempts.get(0).getDedupeKey());
        assertEquals("POST_FEATURED:42:2:9", attempts.get(1).getDedupeKey());
        assertNotEquals(attempts.get(0).getDedupeKey(), attempts.get(1).getDedupeKey());
    }

    @Test
    void replyNotifiesTheRepliedUserAndDistinctContentAuthorExactlyOnceEach()
    {
        ShopZhenkePost post = new ShopZhenkePost();
        post.setPostId(51L);
        post.setShopUserId(10L);
        post.setTitle("夜游古城");
        ShopZhenkePostComment reply = new ShopZhenkePostComment();
        reply.setCommentId(101L);
        reply.setShopUserId(20L);
        reply.setReplyToShopUserId(30L);
        reply.setContent("这个路线很实用");

        service.postComment(post, reply);

        ArgumentCaptor<ShopNotification> captor = ArgumentCaptor.forClass(ShopNotification.class);
        verify(mapper, org.mockito.Mockito.times(2)).insertNotification(captor.capture());
        List<ShopNotification> messages = captor.getAllValues();
        assertEquals(30L, messages.get(0).getRecipientShopUserId());
        assertEquals(ShopNotificationService.POST_REPLY, messages.get(0).getEventType());
        assertEquals(10L, messages.get(1).getRecipientShopUserId());
        assertEquals(ShopNotificationService.POST_COMMENT, messages.get(1).getEventType());
        assertNotEquals(messages.get(0).getDedupeKey(), messages.get(1).getDedupeKey());

        reset(mapper);
        reply.setReplyToShopUserId(10L);
        service.postComment(post, reply);
        verify(mapper, org.mockito.Mockito.times(1)).insertNotification(captor.capture());

        reset(mapper);
        reply.setShopUserId(10L);
        service.postComment(post, reply);
        verify(mapper, never()).insertNotification(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void reportCommentUsesTheSameRecipientRulesWithoutMixingOfficialEnjoyContent()
    {
        ShopVerificationReport report = new ShopVerificationReport();
        report.setReportId(61L);
        report.setShopUserId(11L);
        report.setTitle("一次真实核销体验");
        ShopVerificationReportComment comment = new ShopVerificationReportComment();
        comment.setCommentId(201L);
        comment.setShopUserId(22L);
        comment.setContent("讲得很清楚");

        service.reportComment(report, comment);

        ArgumentCaptor<ShopNotification> captor = ArgumentCaptor.forClass(ShopNotification.class);
        verify(mapper).insertNotification(captor.capture());
        assertEquals(ShopNotificationService.REPORT_COMMENT, captor.getValue().getEventType());
        assertEquals(ShopNotificationService.TARGET_REPORT, captor.getValue().getTargetType());
        assertEquals(11L, captor.getValue().getRecipientShopUserId());
    }

    @Test
    void inboxReadsAndUpdatesAreAlwaysScopedToTheAuthenticatedRecipient()
    {
        authenticateShopUser(77L);
        when(mapper.selectNotifications(77L)).thenReturn(List.of());
        when(mapper.countUnread(77L)).thenReturn(3);

        service.notifications(1, 200);
        assertEquals(3, service.unreadCount());
        service.markRead(99L);
        service.markAllRead();

        verify(mapper).selectNotifications(77L);
        verify(mapper).markRead(99L, 77L);
        verify(mapper).markAllRead(77L);
    }

    @Test
    void anonymousUsersCannotReadOrMutateAnInbox()
    {
        assertThrows(ServiceException.class, service::unreadCount);
        assertThrows(ServiceException.class, () -> service.notifications(1, 15));
        assertThrows(ServiceException.class, () -> service.markRead(1L));
        assertThrows(ServiceException.class, service::markAllRead);
        verify(mapper, never()).selectNotifications(org.mockito.ArgumentMatchers.anyLong());
        verify(mapper, never()).markRead(org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong());
    }

    private void authenticateShopUser(long userId)
    {
        SysUser user = new SysUser();
        LoginUser principal = new LoginUser(
                ShopAccountIdentity.toPrincipalId(userId), null, user,
                Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
