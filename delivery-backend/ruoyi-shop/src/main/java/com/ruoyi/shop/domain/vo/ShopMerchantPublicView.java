package com.ruoyi.shop.domain.vo;

import java.math.BigDecimal;

public class ShopMerchantPublicView
{
    private Long merchantId;
    private String shopName;
    private String companyName;
    private String companyCreditCode;
    private String legalPerson;
    private String contactName;
    private String contactPhone;
    private String storeAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;

    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getCompanyCreditCode() { return companyCreditCode; }
    public void setCompanyCreditCode(String companyCreditCode) { this.companyCreditCode = companyCreditCode; }
    public String getLegalPerson() { return legalPerson; }
    public void setLegalPerson(String legalPerson) { this.legalPerson = legalPerson; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getStoreAddress() { return storeAddress; }
    public void setStoreAddress(String storeAddress) { this.storeAddress = storeAddress; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
}
