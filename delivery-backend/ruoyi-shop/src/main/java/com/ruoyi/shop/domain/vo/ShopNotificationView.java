package com.ruoyi.shop.domain.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.util.Date;

public class ShopNotificationView
{
    private Long notificationId;
    private Long actorShopUserId;
    private String actorName;
    private String actorAvatar;
    private String eventType;
    private String targetType;
    private Long targetId;
    private String targetTitle;
    private String contentPreview;
    private String targetPath;
    private boolean read;
    private Date readTime;
    private Date createTime;

    public Long getNotificationId() { return notificationId; }
    public void setNotificationId(Long notificationId) { this.notificationId = notificationId; }
    public Long getActorShopUserId() { return actorShopUserId; }
    public void setActorShopUserId(Long actorShopUserId) { this.actorShopUserId = actorShopUserId; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public String getActorAvatar() { return actorAvatar; }
    public void setActorAvatar(String actorAvatar) { this.actorAvatar = actorAvatar; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    public String getTargetTitle() { return targetTitle; }
    public void setTargetTitle(String targetTitle) { this.targetTitle = targetTitle; }
    public String getContentPreview() { return contentPreview; }
    public void setContentPreview(String contentPreview) { this.contentPreview = contentPreview; }
    public String getTargetPath() { return targetPath; }
    public void setTargetPath(String targetPath) { this.targetPath = targetPath; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getReadTime() { return readTime; }
    public void setReadTime(Date readTime) { this.readTime = readTime; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
}
