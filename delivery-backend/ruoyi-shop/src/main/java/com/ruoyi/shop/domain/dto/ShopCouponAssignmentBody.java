package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public class ShopCouponAssignmentBody
{
    @NotNull(message = "优惠券不能为空")
    @Positive(message = "优惠券参数无效")
    private Long userCouponId;

    @NotNull(message = "优惠券目标商家不能为空")
    @Positive(message = "优惠券目标商家无效")
    private Long merchantId;

    @NotNull(message = "优惠券目标履约方式不能为空")
    @Pattern(regexp = "ONLINE|OFFLINE", message = "优惠券目标履约方式无效")
    private String fulfillmentType;

    @Positive(message = "优惠券目标商品无效")
    private Long localLifeProductId;

    public Long getUserCouponId() { return userCouponId; }
    public void setUserCouponId(Long userCouponId) { this.userCouponId = userCouponId; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getFulfillmentType() { return fulfillmentType; }
    public void setFulfillmentType(String fulfillmentType) { this.fulfillmentType = fulfillmentType; }
    public Long getLocalLifeProductId() { return localLifeProductId; }
    public void setLocalLifeProductId(Long localLifeProductId) { this.localLifeProductId = localLifeProductId; }
}
