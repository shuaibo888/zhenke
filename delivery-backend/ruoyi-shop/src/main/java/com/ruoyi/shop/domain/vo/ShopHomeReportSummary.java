package com.ruoyi.shop.domain.vo;

public class ShopHomeReportSummary
{
    private Long shopUserId;
    private String userName;
    private String shortcoming;
    private String recommend;
    public Long getShopUserId() { return shopUserId; }
    public void setShopUserId(Long shopUserId) { this.shopUserId = shopUserId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getShortcoming() { return shortcoming; }
    public void setShortcoming(String shortcoming) { this.shortcoming = shortcoming; }
    public String getRecommend() { return recommend; }
    public void setRecommend(String recommend) { this.recommend = recommend; }
}
