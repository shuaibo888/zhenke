package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class ShopCartQuantityBody
{
    @NotNull(message = "请输入商品数量")
    @Min(value = 1, message = "商品数量至少为1")
    @Max(value = 99, message = "单个商品最多购买99件")
    private Integer quantity;

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
