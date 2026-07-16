package com.ruoyi.shop.domain.vo;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopHomeFeedItem
{
    private String contentType;
    private Long contentId;
    private Long productId;
    private Long merchantId;
    private String merchantName;
    private String categoryCode;
    private String categoryName;
    private String title;
    private String summary;
    private String coverUrl;
    private Date publishedAt;
    private Boolean purchasable;
    private ShopHomeTrialSummary trial;
    private ShopHomeReportSummary report;

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getContentId() { return contentId; }
    public void setContentId(Long contentId) { this.contentId = contentId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Date publishedAt) { this.publishedAt = publishedAt; }
    public Boolean getPurchasable() { return purchasable; }
    public void setPurchasable(Boolean purchasable) { this.purchasable = purchasable; }
    public ShopHomeTrialSummary getTrial() { return trial; }
    public void setTrial(ShopHomeTrialSummary trial) { this.trial = trial; }
    public ShopHomeReportSummary getReport() { return report; }
    public void setReport(ShopHomeReportSummary report) { this.report = report; }
}
