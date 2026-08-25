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
    private String usageMode;
    private String redeemInstructions;
    private String scopeType;
    private BigDecimal discountAmount;
    private BigDecimal minimumSpend;
    private Date startTime;
    private Date endTime;
    private String couponStatus;
    private String availabilityStatus;
    private String userName;
    private String nickName;
    private Long redeemedMerchantId;
    private String redeemedMerchantName;
    private BigDecimal consumptionAmount;
    private BigDecimal actualAmount;
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
    public String getUsageMode() { return usageMode; }
    public void setUsageMode(String usageMode) { this.usageMode = usageMode; }
    public String getRedeemInstructions() { return redeemInstructions; }
    public void setRedeemInstructions(String redeemInstructions) { this.redeemInstructions = redeemInstructions; }
    public String getScopeType() { return scopeType; }
    public void setScopeType(String scopeType) { this.scopeType = scopeType; }
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
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getNickName() { return nickName; }
    public void setNickName(String nickName) { this.nickName = nickName; }
    public Long getRedeemedMerchantId() { return redeemedMerchantId; }
    public void setRedeemedMerchantId(Long redeemedMerchantId) { this.redeemedMerchantId = redeemedMerchantId; }
    public String getRedeemedMerchantName() { return redeemedMerchantName; }
    public void setRedeemedMerchantName(String redeemedMerchantName) { this.redeemedMerchantName = redeemedMerchantName; }
    public BigDecimal getConsumptionAmount() { return consumptionAmount; }
    public void setConsumptionAmount(BigDecimal consumptionAmount) { this.consumptionAmount = consumptionAmount; }
    public BigDecimal getActualAmount() { return actualAmount; }
    public void setActualAmount(BigDecimal actualAmount) { this.actualAmount = actualAmount; }
    public List<ShopCouponMerchant> getMerchants() { return merchants; }
    public void setMerchants(List<ShopCouponMerchant> merchants) { this.merchants = merchants; }
}
