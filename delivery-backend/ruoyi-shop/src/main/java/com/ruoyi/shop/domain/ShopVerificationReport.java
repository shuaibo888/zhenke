package com.ruoyi.shop.domain;

import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopVerificationReport
{
    private Long reportId;
    private Long productId;
    private String productName;
    private String productCoverUrl;
    private Long merchantId;
    private String merchantName;
    private String categoryCode;
    private String categoryName;
    private Long trialApplicationId;
    private Long shopUserId;
    private String userName;
    private String nickName;
    private String experience;
    private String shortcoming;
    private String fitCrowd;
    private String recommend;
    private String status;
    private Date publishedAt;
    private List<ShopVerificationReportResource> resources;

    public Long getReportId() { return reportId; }
    public void setReportId(Long reportId) { this.reportId = reportId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getProductCoverUrl() { return productCoverUrl; }
    public void setProductCoverUrl(String productCoverUrl) { this.productCoverUrl = productCoverUrl; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public Long getTrialApplicationId() { return trialApplicationId; }
    public void setTrialApplicationId(Long trialApplicationId) { this.trialApplicationId = trialApplicationId; }
    public Long getShopUserId() { return shopUserId; }
    public void setShopUserId(Long shopUserId) { this.shopUserId = shopUserId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getNickName() { return nickName; }
    public void setNickName(String nickName) { this.nickName = nickName; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getShortcoming() { return shortcoming; }
    public void setShortcoming(String shortcoming) { this.shortcoming = shortcoming; }
    public String getFitCrowd() { return fitCrowd; }
    public void setFitCrowd(String fitCrowd) { this.fitCrowd = fitCrowd; }
    public String getRecommend() { return recommend; }
    public void setRecommend(String recommend) { this.recommend = recommend; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Date publishedAt) { this.publishedAt = publishedAt; }
    public List<ShopVerificationReportResource> getResources() { return resources; }
    public void setResources(List<ShopVerificationReportResource> resources) { this.resources = resources; }
}
