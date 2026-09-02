package com.ruoyi.shop.service;

import com.github.pagehelper.PageHelper;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopNotification;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportComment;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.ShopZhenkePostComment;
import com.ruoyi.shop.domain.vo.ShopNotificationView;
import com.ruoyi.shop.mapper.ShopNotificationMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class ShopNotificationService
{
    public static final String POST_USEFUL = "POST_USEFUL";
    public static final String POST_FEATURED = "POST_FEATURED";
    public static final String POST_COMMENT = "POST_COMMENT";
    public static final String POST_REPLY = "POST_REPLY";
    public static final String REPORT_USEFUL = "REPORT_USEFUL";
    public static final String REPORT_COMMENT = "REPORT_COMMENT";
    public static final String REPORT_REPLY = "REPORT_REPLY";
    public static final String TARGET_POST = "POST";
    public static final String TARGET_REPORT = "REPORT";

    private static final int MAX_PREVIEW_LENGTH = 180;
    private final ShopNotificationMapper mapper;

    public ShopNotificationService(ShopNotificationMapper mapper)
    {
        this.mapper = mapper;
    }

    public List<ShopNotificationView> notifications(int pageNum, int pageSize)
    {
        long recipientId = ShopAccountIdentity.requireAuthenticatedShopUserId();
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
        return mapper.selectNotifications(recipientId);
    }

    public int unreadCount()
    {
        return mapper.countUnread(ShopAccountIdentity.requireAuthenticatedShopUserId());
    }

    public void markRead(long notificationId)
    {
        mapper.markRead(notificationId, ShopAccountIdentity.requireAuthenticatedShopUserId());
    }

    public void markAllRead()
    {
        mapper.markAllRead(ShopAccountIdentity.requireAuthenticatedShopUserId());
    }

    public void postUseful(ShopZhenkePost post, long actorId)
    {
        create(POST_USEFUL, TARGET_POST, post.getPostId(), null, post.getShopUserId(), actorId,
                post.getTitle(), null);
    }

    public void postFeatured(ShopZhenkePost post)
    {
        if (post == null || post.getPostId() == null || post.getShopUserId() == null
                || post.getFeaturedVersion() == null || post.getFeaturedVersion() <= 0)
        {
            return;
        }
        ShopNotification notification = new ShopNotification();
        notification.setRecipientShopUserId(post.getShopUserId());
        notification.setActorShopUserId(null);
        notification.setEventType(POST_FEATURED);
        notification.setTargetType(TARGET_POST);
        notification.setTargetId(post.getPostId());
        notification.setSourceId(post.getFeaturedVersion());
        notification.setTargetTitle(trimToLength(post.getTitle(), 120));
        notification.setContentPreview("你的甄客帖已入选编辑推荐");
        notification.setDedupeKey(String.join(":", POST_FEATURED,
                String.valueOf(post.getPostId()), String.valueOf(post.getFeaturedVersion()),
                String.valueOf(post.getShopUserId())));
        mapper.insertNotification(notification);
    }

    public void reportUseful(ShopVerificationReport report, long actorId)
    {
        create(REPORT_USEFUL, TARGET_REPORT, report.getReportId(), null, report.getShopUserId(), actorId,
                reportTitle(report), null);
    }

    public void postComment(ShopZhenkePost post, ShopZhenkePostComment comment)
    {
        Long replyRecipient = comment.getReplyToShopUserId();
        if (replyRecipient != null)
        {
            create(POST_REPLY, TARGET_POST, post.getPostId(), comment.getCommentId(), replyRecipient,
                    comment.getShopUserId(), post.getTitle(), comment.getContent());
        }
        if (replyRecipient == null || !Objects.equals(replyRecipient, post.getShopUserId()))
        {
            create(POST_COMMENT, TARGET_POST, post.getPostId(), comment.getCommentId(), post.getShopUserId(),
                    comment.getShopUserId(), post.getTitle(), comment.getContent());
        }
    }

    public void reportComment(ShopVerificationReport report, ShopVerificationReportComment comment)
    {
        Long replyRecipient = comment.getReplyToShopUserId();
        if (replyRecipient != null)
        {
            create(REPORT_REPLY, TARGET_REPORT, report.getReportId(), comment.getCommentId(), replyRecipient,
                    comment.getShopUserId(), reportTitle(report), comment.getContent());
        }
        if (replyRecipient == null || !Objects.equals(replyRecipient, report.getShopUserId()))
        {
            create(REPORT_COMMENT, TARGET_REPORT, report.getReportId(), comment.getCommentId(),
                    report.getShopUserId(), comment.getShopUserId(), reportTitle(report), comment.getContent());
        }
    }

    private void create(String eventType, String targetType, Long targetId, Long sourceId,
            Long recipientId, Long actorId, String targetTitle, String preview)
    {
        if (recipientId == null || actorId == null || Objects.equals(recipientId, actorId))
        {
            return;
        }
        ShopNotification notification = new ShopNotification();
        notification.setRecipientShopUserId(recipientId);
        notification.setActorShopUserId(actorId);
        notification.setEventType(eventType);
        notification.setTargetType(targetType);
        notification.setTargetId(targetId);
        notification.setSourceId(sourceId);
        notification.setTargetTitle(trimToLength(targetTitle, 120));
        notification.setContentPreview(trimToLength(preview, MAX_PREVIEW_LENGTH));
        notification.setDedupeKey(String.join(":", eventType, String.valueOf(targetId),
                String.valueOf(sourceId == null ? actorId : sourceId), String.valueOf(recipientId)));
        mapper.insertNotification(notification);
    }

    private String reportTitle(ShopVerificationReport report)
    {
        String title = StringUtils.trim(report.getTitle());
        return title.isEmpty() ? StringUtils.trim(report.getProductName()) : title;
    }

    private String trimToLength(String value, int maxLength)
    {
        String text = StringUtils.trim(value);
        if (text.isEmpty()) return null;
        int codePoints = text.codePointCount(0, text.length());
        if (codePoints <= maxLength) return text;
        return text.substring(0, text.offsetByCodePoints(0, maxLength));
    }
}
