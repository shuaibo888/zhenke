package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;

public class ShopOrderCoupon
{
    private Long orderCouponId;
    private Long orderId;
    private Long userCouponId;
    private Long couponId;
    private String couponName;
    private String couponCode;
    private String scopeType;
    private BigDecimal faceDiscountAmount;
    private BigDecimal appliedDiscountAmount;
    private Date createTime;

    public Long getOrderCouponId() { return orderCouponId; }
    public void setOrderCouponId(Long orderCouponId) { this.orderCouponId = orderCouponId; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public Long getUserCouponId() { return userCouponId; }
    public void setUserCouponId(Long userCouponId) { this.userCouponId = userCouponId; }
    public Long getCouponId() { return couponId; }
    public void setCouponId(Long couponId) { this.couponId = couponId; }
    public String getCouponName() { return couponName; }
    public void setCouponName(String couponName) { this.couponName = couponName; }
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public String getScopeType() { return scopeType; }
    public void setScopeType(String scopeType) { this.scopeType = scopeType; }
    public BigDecimal getFaceDiscountAmount() { return faceDiscountAmount; }
    public void setFaceDiscountAmount(BigDecimal faceDiscountAmount) { this.faceDiscountAmount = faceDiscountAmount; }
    public BigDecimal getAppliedDiscountAmount() { return appliedDiscountAmount; }
    public void setAppliedDiscountAmount(BigDecimal appliedDiscountAmount) { this.appliedDiscountAmount = appliedDiscountAmount; }
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
}
