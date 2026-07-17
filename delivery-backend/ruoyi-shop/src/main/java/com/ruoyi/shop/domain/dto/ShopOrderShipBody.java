package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopOrderShipBody
{
    @NotBlank(message = "请输入物流公司")
    @Size(max = 50, message = "物流公司不能超过50个字符")
    private String carrier;

    @NotBlank(message = "请输入物流单号")
    @Size(max = 100, message = "物流单号不能超过100个字符")
    private String trackingNo;

    public String getCarrier() { return carrier; }
    public void setCarrier(String carrier) { this.carrier = carrier; }
    public String getTrackingNo() { return trackingNo; }
    public void setTrackingNo(String trackingNo) { this.trackingNo = trackingNo; }
}
