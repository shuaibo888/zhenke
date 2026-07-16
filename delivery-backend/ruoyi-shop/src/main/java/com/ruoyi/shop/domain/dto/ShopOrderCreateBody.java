package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopOrderCreateBody
{
    @NotNull(message = "请选择收货地址")
    private Long addressId;

    @Valid
    @NotEmpty(message = "订单商品不能为空")
    @Size(max = 50, message = "一次最多提交50种商品")
    private List<ShopOrderItemBody> items;

    public Long getAddressId() { return addressId; }
    public void setAddressId(Long addressId) { this.addressId = addressId; }
    public List<ShopOrderItemBody> getItems() { return items; }
    public void setItems(List<ShopOrderItemBody> items) { this.items = items; }
}
