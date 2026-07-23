package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;

public class ShopVerificationReport
{
    private Long reportId;
    private Long productId;
    private String productName;
    private String productSubtitle;
    private String productDetail;
    private String productCoverUrl;
    private Long merchantId;
    private String merchantName;
    private String categoryCode;
    private String categoryName;
    private Long trialApplicationId;
    private String trialType;
    private String reportSource;
    private Long orderItemId;
    private Long sourceReportId;
    private Long shopUserId;
    private String userName;
    private String nickName;
    private String experience;
    private String shortcoming;
    private String fitCrowd;
    private String recommend;
    private Integer productQuality;
    private Integer logisticsService;
    private Integer serviceAttitude;
    private BigDecimal aiScore;
    private String aiScoreStatus;
    private String aiScoreReason;
    private Date aiScoredAt;
    private long usefulCount;
    private boolean usefulByMe;
    private String status;
    private Date publishedAt;
    private List<ShopVerificationReportResource> resources;

    public Long getReportId() { return reportId; }
    public void setReportId(Long reportId) { this.reportId = reportId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    @JsonIgnore public String getProductSubtitle() { return productSubtitle; }
    public void setProductSubtitle(String productSubtitle) { this.productSubtitle = productSubtitle; }
    @JsonIgnore public String getProductDetail() { return productDetail; }
    public void setProductDetail(String productDetail) { this.productDetail = productDetail; }
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
    public String getTrialType() { return trialType; }
    public void setTrialType(String trialType) { this.trialType = trialType; }
    public String getReportSource() { return reportSource; }
    public void setReportSource(String reportSource) { this.reportSource = reportSource; }
    public Long getOrderItemId() { return orderItemId; }
    public void setOrderItemId(Long orderItemId) { this.orderItemId = orderItemId; }
    public Long getSourceReportId() { return sourceReportId; }
    public void setSourceReportId(Long sourceReportId) { this.sourceReportId = sourceReportId; }
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
    public Integer getProductQuality() { return productQuality; }
    public void setProductQuality(Integer productQuality) { this.productQuality = productQuality; }
    public Integer getLogisticsService() { return logisticsService; }
    public void setLogisticsService(Integer logisticsService) { this.logisticsService = logisticsService; }
    public Integer getServiceAttitude() { return serviceAttitude; }
    public void setServiceAttitude(Integer serviceAttitude) { this.serviceAttitude = serviceAttitude; }
    public BigDecimal getAiScore() { return aiScore; }
    public void setAiScore(BigDecimal aiScore) { this.aiScore = aiScore; }
    public String getAiScoreStatus() { return aiScoreStatus; }
    public void setAiScoreStatus(String aiScoreStatus) { this.aiScoreStatus = aiScoreStatus; }
    public String getAiScoreReason() { return aiScoreReason; }
    public void setAiScoreReason(String aiScoreReason) { this.aiScoreReason = aiScoreReason; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getAiScoredAt() { return aiScoredAt; }
    public void setAiScoredAt(Date aiScoredAt) { this.aiScoredAt = aiScoredAt; }
    public long getUsefulCount() { return usefulCount; }
    public void setUsefulCount(long usefulCount) { this.usefulCount = usefulCount; }
    public boolean isUsefulByMe() { return usefulByMe; }
    public void setUsefulByMe(boolean usefulByMe) { this.usefulByMe = usefulByMe; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Date publishedAt) { this.publishedAt = publishedAt; }
    public List<ShopVerificationReportResource> getResources() { return resources; }
    public void setResources(List<ShopVerificationReportResource> resources) { this.resources = resources; }
}
