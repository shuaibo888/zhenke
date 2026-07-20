package com.ruoyi.shop.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

public class ShopTrialCampaign extends BaseEntity
{
    private static final long serialVersionUID = 1L;
    private Long campaignId;
    private Long merchantId;
    private String merchantName;
    private Long productId;
    private String trialType;
    private String productName;
    private String productCoverUrl;
    private String categoryCode;
    private String categoryName;
    private String campaignTitle;
    private String campaignSummary;
    private Integer targetCount;
    private Integer applicantCount;
    private Integer approvedCount;
    private Date applicationDeadline;
    private String status;
    private Date publishedAt;

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getTrialType() { return trialType; }
    public void setTrialType(String trialType) { this.trialType = trialType; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getProductCoverUrl() { return productCoverUrl; }
    public void setProductCoverUrl(String productCoverUrl) { this.productCoverUrl = productCoverUrl; }
    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getCampaignTitle() { return campaignTitle; }
    public void setCampaignTitle(String campaignTitle) { this.campaignTitle = campaignTitle; }
    public String getCampaignSummary() { return campaignSummary; }
    public void setCampaignSummary(String campaignSummary) { this.campaignSummary = campaignSummary; }
    public Integer getTargetCount() { return targetCount; }
    public void setTargetCount(Integer targetCount) { this.targetCount = targetCount; }
    public Integer getApplicantCount() { return applicantCount; }
    public void setApplicantCount(Integer applicantCount) { this.applicantCount = applicantCount; }
    public Integer getApprovedCount() { return approvedCount; }
    public void setApprovedCount(Integer approvedCount) { this.approvedCount = approvedCount; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getApplicationDeadline() { return applicationDeadline; }
    public void setApplicationDeadline(Date applicationDeadline) { this.applicationDeadline = applicationDeadline; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Date publishedAt) { this.publishedAt = publishedAt; }
}
