package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopCouponStatusBody
{
    @NotBlank(message = "请选择优惠券状态")
    @Pattern(regexp = "ENABLED|DISABLED", message = "优惠券状态无效")
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
