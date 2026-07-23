package com.ruoyi.shop.domain.vo;

import java.math.BigDecimal;

public class ShopHomeReportSummary
{
    private Long shopUserId;
    private String userName;
    private String shortcoming;
    private String recommend;
    private BigDecimal aiScore;
    private String aiScoreStatus;
    public Long getShopUserId() { return shopUserId; }
    public void setShopUserId(Long shopUserId) { this.shopUserId = shopUserId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getShortcoming() { return shortcoming; }
    public void setShortcoming(String shortcoming) { this.shortcoming = shortcoming; }
    public String getRecommend() { return recommend; }
    public void setRecommend(String recommend) { this.recommend = recommend; }
    public BigDecimal getAiScore() { return aiScore; }
    public void setAiScore(BigDecimal aiScore) { this.aiScore = aiScore; }
    public String getAiScoreStatus() { return aiScoreStatus; }
    public void setAiScoreStatus(String aiScoreStatus) { this.aiScoreStatus = aiScoreStatus; }
}
