package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;

public class ShopProductCertification
{
    private Long certificationId;
    private String certificationNo;
    private Long tenantId;
    private Long merchantId;
    private Long productId;
    private Integer versionNo;
    private String currentFlag;
    private String status;
    private String sourceType;
    private String supplierName;
    private String originPlace;
    private String shippingPlace;
    private String matchType;
    private String matchValue;
    private String proofType;
    private String declarationConfirmed;
    private String productSnapshot;
    private String inputHash;
    private String aiProvider;
    private String aiModel;
    private String promptVersion;
    private String aiDecision;
    private BigDecimal confidence;
    private String matchedFields;
    private String missingFields;
    private String riskFlags;
    private String merchantReason;
    private String publicSummary;
    private Date materialValidUntil;
    private Date passedAt;
    private Date expiresAt;
    private Integer attemptCount;
    private Date nextRetryAt;
    private Date lockedAt;
    private String lastError;
    private Date submittedAt;
    private String createBy;
    private String updateBy;
    private List<ShopProductCertificationMaterial> materials;

    public Long getCertificationId() { return certificationId; }
    public void setCertificationId(Long certificationId) { this.certificationId = certificationId; }
    public String getCertificationNo() { return certificationNo; }
    public void setCertificationNo(String certificationNo) { this.certificationNo = certificationNo; }
    @JsonIgnore public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    @JsonIgnore public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Integer getVersionNo() { return versionNo; }
    public void setVersionNo(Integer versionNo) { this.versionNo = versionNo; }
    @JsonIgnore public String getCurrentFlag() { return currentFlag; }
    public void setCurrentFlag(String currentFlag) { this.currentFlag = currentFlag; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getOriginPlace() { return originPlace; }
    public void setOriginPlace(String originPlace) { this.originPlace = originPlace; }
    public String getShippingPlace() { return shippingPlace; }
    public void setShippingPlace(String shippingPlace) { this.shippingPlace = shippingPlace; }
    public String getMatchType() { return matchType; }
    public void setMatchType(String matchType) { this.matchType = matchType; }
    public String getMatchValue() { return matchValue; }
    public void setMatchValue(String matchValue) { this.matchValue = matchValue; }
    public String getProofType() { return proofType; }
    public void setProofType(String proofType) { this.proofType = proofType; }
    public String getDeclarationConfirmed() { return declarationConfirmed; }
    public void setDeclarationConfirmed(String declarationConfirmed) { this.declarationConfirmed = declarationConfirmed; }
    @JsonIgnore public String getProductSnapshot() { return productSnapshot; }
    public void setProductSnapshot(String productSnapshot) { this.productSnapshot = productSnapshot; }
    @JsonIgnore public String getInputHash() { return inputHash; }
    public void setInputHash(String inputHash) { this.inputHash = inputHash; }
    @JsonIgnore public String getAiProvider() { return aiProvider; }
    public void setAiProvider(String aiProvider) { this.aiProvider = aiProvider; }
    @JsonIgnore public String getAiModel() { return aiModel; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }
    @JsonIgnore public String getPromptVersion() { return promptVersion; }
    public void setPromptVersion(String promptVersion) { this.promptVersion = promptVersion; }
    @JsonIgnore public String getAiDecision() { return aiDecision; }
    public void setAiDecision(String aiDecision) { this.aiDecision = aiDecision; }
    public BigDecimal getConfidence() { return confidence; }
    public void setConfidence(BigDecimal confidence) { this.confidence = confidence; }
    @JsonIgnore public String getMatchedFields() { return matchedFields; }
    public void setMatchedFields(String matchedFields) { this.matchedFields = matchedFields; }
    @JsonIgnore public String getMissingFields() { return missingFields; }
    public void setMissingFields(String missingFields) { this.missingFields = missingFields; }
    @JsonIgnore public String getRiskFlags() { return riskFlags; }
    public void setRiskFlags(String riskFlags) { this.riskFlags = riskFlags; }
    public String getMerchantReason() { return merchantReason; }
    public void setMerchantReason(String merchantReason) { this.merchantReason = merchantReason; }
    public String getPublicSummary() { return publicSummary; }
    public void setPublicSummary(String publicSummary) { this.publicSummary = publicSummary; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getMaterialValidUntil() { return materialValidUntil; }
    public void setMaterialValidUntil(Date materialValidUntil) { this.materialValidUntil = materialValidUntil; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getPassedAt() { return passedAt; }
    public void setPassedAt(Date passedAt) { this.passedAt = passedAt; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Date expiresAt) { this.expiresAt = expiresAt; }
    @JsonIgnore public Integer getAttemptCount() { return attemptCount; }
    public void setAttemptCount(Integer attemptCount) { this.attemptCount = attemptCount; }
    @JsonIgnore public Date getNextRetryAt() { return nextRetryAt; }
    public void setNextRetryAt(Date nextRetryAt) { this.nextRetryAt = nextRetryAt; }
    @JsonIgnore public Date getLockedAt() { return lockedAt; }
    public void setLockedAt(Date lockedAt) { this.lockedAt = lockedAt; }
    @JsonIgnore public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Date submittedAt) { this.submittedAt = submittedAt; }
    @JsonIgnore public String getCreateBy() { return createBy; }
    public void setCreateBy(String createBy) { this.createBy = createBy; }
    @JsonIgnore public String getUpdateBy() { return updateBy; }
    public void setUpdateBy(String updateBy) { this.updateBy = updateBy; }
    public List<ShopProductCertificationMaterial> getMaterials() { return materials; }
    public void setMaterials(List<ShopProductCertificationMaterial> materials) { this.materials = materials; }
}
