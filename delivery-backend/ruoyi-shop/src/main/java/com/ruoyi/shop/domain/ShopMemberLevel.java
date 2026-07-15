package com.ruoyi.shop.domain;

import com.ruoyi.common.core.domain.BaseEntity;

public class ShopMemberLevel extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long levelId;
    private String levelCode;
    private String levelName;
    private Integer levelOrder;
    private String badgeTone;
    private String isDefault;
    private String status;

    public Long getLevelId() { return levelId; }
    public void setLevelId(Long levelId) { this.levelId = levelId; }
    public String getLevelCode() { return levelCode; }
    public void setLevelCode(String levelCode) { this.levelCode = levelCode; }
    public String getLevelName() { return levelName; }
    public void setLevelName(String levelName) { this.levelName = levelName; }
    public Integer getLevelOrder() { return levelOrder; }
    public void setLevelOrder(Integer levelOrder) { this.levelOrder = levelOrder; }
    public String getBadgeTone() { return badgeTone; }
    public void setBadgeTone(String badgeTone) { this.badgeTone = badgeTone; }
    public String getIsDefault() { return isDefault; }
    public void setIsDefault(String isDefault) { this.isDefault = isDefault; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
