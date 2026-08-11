package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopCartCheckoutBody
{
    @NotNull(message = "请选择收货地址")
    private Long addressId;

    @Size(max = 50, message = "一笔订单最多使用50张优惠券")
    private List<@NotNull(message = "优惠券不能为空") Long> userCouponIds;

    public Long getAddressId() { return addressId; }
    public void setAddressId(Long addressId) { this.addressId = addressId; }
    public List<Long> getUserCouponIds() { return userCouponIds; }
    public void setUserCouponIds(List<Long> userCouponIds) { this.userCouponIds = userCouponIds; }
}
