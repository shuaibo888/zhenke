package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

public class ShopCoupon extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long couponId;
    private Long ownerMerchantId;
    private String couponName;
    private String description;
    private BigDecimal discountAmount;
    private BigDecimal minimumSpend;
    private Date startTime;
    private Date endTime;
    private String status;
    private Integer totalStock;
    private Integer issuedCount;
    private List<ShopCouponMerchant> merchants;

    public Long getCouponId() { return couponId; }
    public void setCouponId(Long couponId) { this.couponId = couponId; }
    public Long getOwnerMerchantId() { return ownerMerchantId; }
    public void setOwnerMerchantId(Long ownerMerchantId) { this.ownerMerchantId = ownerMerchantId; }
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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getTotalStock() { return totalStock; }
    public void setTotalStock(Integer totalStock) { this.totalStock = totalStock; }
    public Integer getIssuedCount() { return issuedCount; }
    public void setIssuedCount(Integer issuedCount) { this.issuedCount = issuedCount; }
    public List<ShopCouponMerchant> getMerchants() { return merchants; }
    public void setMerchants(List<ShopCouponMerchant> merchants) { this.merchants = merchants; }
}
