package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopOrderRedeemBody
{
    @NotBlank(message = "核销码不能为空")
    @Size(max = 64, message = "核销码不能超过64个字符")
    private String redeemCode;

    public String getRedeemCode() { return redeemCode; }
    public void setRedeemCode(String redeemCode) { this.redeemCode = redeemCode; }
}
