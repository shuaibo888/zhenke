package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotNull;

public class ShopCartCheckoutBody
{
    @NotNull(message = "请选择收货地址")
    private Long addressId;

    private Long userCouponId;

    public Long getAddressId() { return addressId; }
    public void setAddressId(Long addressId) { this.addressId = addressId; }
    public Long getUserCouponId() { return userCouponId; }
    public void setUserCouponId(Long userCouponId) { this.userCouponId = userCouponId; }
}
