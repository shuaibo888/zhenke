package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopUserStatusBody
{
    @NotBlank(message = "请选择账号状态")
    @Pattern(regexp = "^[01]$", message = "账号状态不正确")
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
