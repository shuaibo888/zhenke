package com.ruoyi.shop.domain;

public class ShopOrderAddress
{
    private Long orderAddressId;
    private Long orderId;
    private String recipient;
    private String phone;
    private String provinceCode;
    private String cityCode;
    private String districtCode;
    private String detail;

    public Long getOrderAddressId() { return orderAddressId; }
    public void setOrderAddressId(Long orderAddressId) { this.orderAddressId = orderAddressId; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getProvinceCode() { return provinceCode; }
    public void setProvinceCode(String provinceCode) { this.provinceCode = provinceCode; }
    public String getCityCode() { return cityCode; }
    public void setCityCode(String cityCode) { this.cityCode = cityCode; }
    public String getDistrictCode() { return districtCode; }
    public void setDistrictCode(String districtCode) { this.districtCode = districtCode; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
}
