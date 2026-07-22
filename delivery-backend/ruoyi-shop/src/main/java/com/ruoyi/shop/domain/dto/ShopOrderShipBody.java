package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopOrderShipBody
{
    @NotBlank(message = "请输入物流单号")
    @Size(max = 100, message = "物流单号不能超过100个字符")
    private String trackingNo;

    public String getTrackingNo() { return trackingNo; }
    public void setTrackingNo(String trackingNo) { this.trackingNo = trackingNo; }
}
