package com.ruoyi.shop.domain;

public class ShopNotification
{
    private Long notificationId;
    private Long recipientShopUserId;
    private Long actorShopUserId;
    private String eventType;
    private String targetType;
    private Long targetId;
    private Long sourceId;
    private String targetTitle;
    private String contentPreview;
    private String dedupeKey;

    public Long getNotificationId() { return notificationId; }
    public void setNotificationId(Long notificationId) { this.notificationId = notificationId; }
    public Long getRecipientShopUserId() { return recipientShopUserId; }
    public void setRecipientShopUserId(Long recipientShopUserId) { this.recipientShopUserId = recipientShopUserId; }
    public Long getActorShopUserId() { return actorShopUserId; }
    public void setActorShopUserId(Long actorShopUserId) { this.actorShopUserId = actorShopUserId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }
    public String getTargetTitle() { return targetTitle; }
    public void setTargetTitle(String targetTitle) { this.targetTitle = targetTitle; }
    public String getContentPreview() { return contentPreview; }
    public void setContentPreview(String contentPreview) { this.contentPreview = contentPreview; }
    public String getDedupeKey() { return dedupeKey; }
    public void setDedupeKey(String dedupeKey) { this.dedupeKey = dedupeKey; }
}
