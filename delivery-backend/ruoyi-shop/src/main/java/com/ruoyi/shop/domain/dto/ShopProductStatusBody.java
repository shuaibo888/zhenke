package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopProductStatusBody
{
    @NotBlank(message = "请选择商品状态")
    @Pattern(regexp = "ON_SALE|OFF_SALE", message = "商品状态无效")
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
