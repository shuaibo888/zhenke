package com.ruoyi.shop.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class ShopProductCertificationMaterial
{
    private Long materialId;
    private Long tenantId;
    private Long certificationId;
    private Long merchantId;
    private Long productId;
    private String materialKind;
    private String materialType;
    private String originalName;
    private String storagePath;
    private String contentType;
    private String fileExtension;
    private Long sizeBytes;
    private String sha256;
    private Integer pageCount;
    private Integer materialSort;

    public Long getMaterialId() { return materialId; }
    public void setMaterialId(Long materialId) { this.materialId = materialId; }
    @JsonIgnore public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    @JsonIgnore public Long getCertificationId() { return certificationId; }
    public void setCertificationId(Long certificationId) { this.certificationId = certificationId; }
    @JsonIgnore public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    @JsonIgnore public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getMaterialKind() { return materialKind; }
    public void setMaterialKind(String materialKind) { this.materialKind = materialKind; }
    public String getMaterialType() { return materialType; }
    public void setMaterialType(String materialType) { this.materialType = materialType; }
    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }
    @JsonIgnore public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public String getFileExtension() { return fileExtension; }
    public void setFileExtension(String fileExtension) { this.fileExtension = fileExtension; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    @JsonIgnore public String getSha256() { return sha256; }
    public void setSha256(String sha256) { this.sha256 = sha256; }
    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }
    public Integer getMaterialSort() { return materialSort; }
    public void setMaterialSort(Integer materialSort) { this.materialSort = materialSort; }
}
