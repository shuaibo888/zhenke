package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.ruoyi.common.core.domain.BaseEntity;

public class ShopMerchant extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long merchantId;
    private String applicationNo;
    private String accountUsername;
    private String accountPassword;
    private String shopName;
    private String companyName;
    private String companyAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String contactName;
    private String contactPhone;
    private String businessLicense;
    private String companyCreditCode;
    private String legalPerson;
    private String licenseVerified;
    private String productIntro;
    private String originTraceability;
    private String acceptsVerificationRecruitment;
    private String acceptsPublicWelfare;
    private String protocolAgreed;
    private String auditStatus;
    private String auditRemark;
    private Long adminUserId;
    private String adminUsername;
    private String status;
    private String delFlag;
    private String auditBy;
    private Date auditTime;
    private List<ShopMerchantAuditLog> auditLogs;
    private List<ShopMerchantProofMedia> storeProofMedia;

    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getApplicationNo() { return applicationNo; }
    public void setApplicationNo(String applicationNo) { this.applicationNo = applicationNo; }
    public String getAccountUsername() { return accountUsername; }
    public void setAccountUsername(String accountUsername) { this.accountUsername = accountUsername; }
    @JsonIgnore
    public String getAccountPassword() { return accountPassword; }
    public void setAccountPassword(String accountPassword) { this.accountPassword = accountPassword; }
    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getCompanyAddress() { return companyAddress; }
    public void setCompanyAddress(String companyAddress) { this.companyAddress = companyAddress; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getBusinessLicense() { return businessLicense; }
    public void setBusinessLicense(String businessLicense) { this.businessLicense = businessLicense; }
    public String getCompanyCreditCode() { return companyCreditCode; }
    public void setCompanyCreditCode(String companyCreditCode) { this.companyCreditCode = companyCreditCode; }
    public String getLegalPerson() { return legalPerson; }
    public void setLegalPerson(String legalPerson) { this.legalPerson = legalPerson; }
    public String getLicenseVerified() { return licenseVerified; }
    public void setLicenseVerified(String licenseVerified) { this.licenseVerified = licenseVerified; }
    public String getProductIntro() { return productIntro; }
    public void setProductIntro(String productIntro) { this.productIntro = productIntro; }
    public String getOriginTraceability() { return originTraceability; }
    public void setOriginTraceability(String originTraceability) { this.originTraceability = originTraceability; }
    public String getAcceptsVerificationRecruitment() { return acceptsVerificationRecruitment; }
    public void setAcceptsVerificationRecruitment(String value) { this.acceptsVerificationRecruitment = value; }
    public String getAcceptsPublicWelfare() { return acceptsPublicWelfare; }
    public void setAcceptsPublicWelfare(String acceptsPublicWelfare) { this.acceptsPublicWelfare = acceptsPublicWelfare; }
    public String getProtocolAgreed() { return protocolAgreed; }
    public void setProtocolAgreed(String protocolAgreed) { this.protocolAgreed = protocolAgreed; }
    public String getAuditStatus() { return auditStatus; }
    public void setAuditStatus(String auditStatus) { this.auditStatus = auditStatus; }
    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }
    public Long getAdminUserId() { return adminUserId; }
    public void setAdminUserId(Long adminUserId) { this.adminUserId = adminUserId; }
    public String getAdminUsername() { return adminUsername; }
    public void setAdminUsername(String adminUsername) { this.adminUsername = adminUsername; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
    public String getAuditBy() { return auditBy; }
    public void setAuditBy(String auditBy) { this.auditBy = auditBy; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getAuditTime() { return auditTime; }
    public void setAuditTime(Date auditTime) { this.auditTime = auditTime; }
    public List<ShopMerchantAuditLog> getAuditLogs() { return auditLogs; }
    public void setAuditLogs(List<ShopMerchantAuditLog> auditLogs) { this.auditLogs = auditLogs; }
    public List<ShopMerchantProofMedia> getStoreProofMedia() { return storeProofMedia; }
    public void setStoreProofMedia(List<ShopMerchantProofMedia> storeProofMedia) { this.storeProofMedia = storeProofMedia; }
}
