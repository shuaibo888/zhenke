package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;

public class ShopMerchantStatusBody
{
    @NotBlank(message = "请选择商家状态")
    @Pattern(regexp = "^[01]$", message = "商家状态不正确")
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
