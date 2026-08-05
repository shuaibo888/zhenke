package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.ruoyi.common.core.domain.BaseEntity;

public class ShopProduct extends BaseEntity
{
    private static final long serialVersionUID = 1L;
    private Long productId;
    private Long merchantId;
    private String merchantName;
    private Long categoryId;
    private String categoryCode;
    private String categoryName;
    private String brandName;
    private String productName;
    private String subtitle;
    private String detail;
    private String coverUrl;
    private BigDecimal price;
    private Integer stock;
    private Integer salesCount;
    private String status;
    private String delFlag;
    private Boolean trialOnly;
    private String keyword;
    private List<ShopProductImage> images;
    private List<String> mainImageUrls;
    private List<String> detailImageUrls;
    private String certificationStatus;
    private String certificationNo;
    private String certificationSourceType;
    private String certificationSupplierName;
    private String certificationOriginPlace;
    private String certificationShippingPlace;
    private String certificationMatchType;
    private String certificationProofType;
    private String certificationPublicSummary;
    private String certificationMerchantReason;
    private Date certificationPassedAt;
    private Date certificationExpiresAt;

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public Integer getSalesCount() { return salesCount; }
    public void setSalesCount(Integer salesCount) { this.salesCount = salesCount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
    public Boolean getTrialOnly() { return trialOnly; }
    public void setTrialOnly(Boolean trialOnly) { this.trialOnly = trialOnly; }
    @JsonIgnore public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public List<ShopProductImage> getImages() { return images; }
    public void setImages(List<ShopProductImage> images) { this.images = images; }
    public List<String> getMainImageUrls() { return mainImageUrls; }
    public void setMainImageUrls(List<String> mainImageUrls) { this.mainImageUrls = mainImageUrls; }
    public List<String> getDetailImageUrls() { return detailImageUrls; }
    public void setDetailImageUrls(List<String> detailImageUrls) { this.detailImageUrls = detailImageUrls; }
    public String getCertificationStatus() { return certificationStatus; }
    public void setCertificationStatus(String certificationStatus) { this.certificationStatus = certificationStatus; }
    public String getCertificationNo() { return certificationNo; }
    public void setCertificationNo(String certificationNo) { this.certificationNo = certificationNo; }
    public String getCertificationSourceType() { return certificationSourceType; }
    public void setCertificationSourceType(String certificationSourceType) { this.certificationSourceType = certificationSourceType; }
    public String getCertificationSupplierName() { return certificationSupplierName; }
    public void setCertificationSupplierName(String certificationSupplierName) { this.certificationSupplierName = certificationSupplierName; }
    public String getCertificationOriginPlace() { return certificationOriginPlace; }
    public void setCertificationOriginPlace(String certificationOriginPlace) { this.certificationOriginPlace = certificationOriginPlace; }
    public String getCertificationShippingPlace() { return certificationShippingPlace; }
    public void setCertificationShippingPlace(String certificationShippingPlace) { this.certificationShippingPlace = certificationShippingPlace; }
    public String getCertificationMatchType() { return certificationMatchType; }
    public void setCertificationMatchType(String certificationMatchType) { this.certificationMatchType = certificationMatchType; }
    public String getCertificationProofType() { return certificationProofType; }
    public void setCertificationProofType(String certificationProofType) { this.certificationProofType = certificationProofType; }
    public String getCertificationPublicSummary() { return certificationPublicSummary; }
    public void setCertificationPublicSummary(String certificationPublicSummary) { this.certificationPublicSummary = certificationPublicSummary; }
    public String getCertificationMerchantReason() { return certificationMerchantReason; }
    public void setCertificationMerchantReason(String certificationMerchantReason) { this.certificationMerchantReason = certificationMerchantReason; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getCertificationPassedAt() { return certificationPassedAt; }
    public void setCertificationPassedAt(Date certificationPassedAt) { this.certificationPassedAt = certificationPassedAt; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getCertificationExpiresAt() { return certificationExpiresAt; }
    public void setCertificationExpiresAt(Date certificationExpiresAt) { this.certificationExpiresAt = certificationExpiresAt; }
}
