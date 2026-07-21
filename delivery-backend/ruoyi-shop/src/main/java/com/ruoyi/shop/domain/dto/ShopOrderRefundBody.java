package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopOrderRefundBody
{
    @NotBlank(message = "退款原因不能为空")
    @Size(min = 2, max = 200, message = "退款原因长度必须在2到200个字之间")
    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
