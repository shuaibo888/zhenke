package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopOrderCreateBody
{
    private Long addressId;

    @Valid
    @NotEmpty(message = "订单商品不能为空")
    @Size(max = 50, message = "一次最多提交50种商品")
    private List<ShopOrderItemBody> items;

    @Size(max = 50, message = "一笔订单最多使用50张优惠券")
    private List<@NotNull(message = "优惠券不能为空") Long> userCouponIds;

    public Long getAddressId() { return addressId; }
    public void setAddressId(Long addressId) { this.addressId = addressId; }
    public List<ShopOrderItemBody> getItems() { return items; }
    public void setItems(List<ShopOrderItemBody> items) { this.items = items; }
    public List<Long> getUserCouponIds() { return userCouponIds; }
    public void setUserCouponIds(List<Long> userCouponIds) { this.userCouponIds = userCouponIds; }
}
