package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopUserCoupon
{
    private Long userCouponId;
    private Long couponId;
    private Long shopUserId;
    private Long grantId;
    private String couponCode;
    private String status;
    private Long usedOrderId;
    private Date usedTime;
    private Date createTime;
    private String couponName;
    private String description;
    private BigDecimal discountAmount;
    private BigDecimal minimumSpend;
    private Date startTime;
    private Date endTime;
    private String couponStatus;
    private String availabilityStatus;
    private List<ShopCouponMerchant> merchants;

    public Long getUserCouponId() { return userCouponId; }
    public void setUserCouponId(Long userCouponId) { this.userCouponId = userCouponId; }
    public Long getCouponId() { return couponId; }
    public void setCouponId(Long couponId) { this.couponId = couponId; }
    public Long getShopUserId() { return shopUserId; }
    public void setShopUserId(Long shopUserId) { this.shopUserId = shopUserId; }
    public Long getGrantId() { return grantId; }
    public void setGrantId(Long grantId) { this.grantId = grantId; }
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getUsedOrderId() { return usedOrderId; }
    public void setUsedOrderId(Long usedOrderId) { this.usedOrderId = usedOrderId; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getUsedTime() { return usedTime; }
    public void setUsedTime(Date usedTime) { this.usedTime = usedTime; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
    public String getCouponName() { return couponName; }
    public void setCouponName(String couponName) { this.couponName = couponName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getMinimumSpend() { return minimumSpend; }
    public void setMinimumSpend(BigDecimal minimumSpend) { this.minimumSpend = minimumSpend; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getStartTime() { return startTime; }
    public void setStartTime(Date startTime) { this.startTime = startTime; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getEndTime() { return endTime; }
    public void setEndTime(Date endTime) { this.endTime = endTime; }
    public String getCouponStatus() { return couponStatus; }
    public void setCouponStatus(String couponStatus) { this.couponStatus = couponStatus; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public List<ShopCouponMerchant> getMerchants() { return merchants; }
    public void setMerchants(List<ShopCouponMerchant> merchants) { this.merchants = merchants; }
}
