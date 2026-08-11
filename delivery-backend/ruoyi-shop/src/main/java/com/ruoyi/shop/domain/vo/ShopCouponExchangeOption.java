package com.ruoyi.shop.domain.vo;

import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopCouponExchangeOption
{
    private Long couponId;
    private String couponName;
    private String description;
    private BigDecimal discountAmount;
    private BigDecimal minimumSpend;
    private Long pointsCost;
    private Date startTime;
    private Date endTime;
    private Integer remainingStock;
    private Boolean exchanged;

    public Long getCouponId() { return couponId; }
    public void setCouponId(Long couponId) { this.couponId = couponId; }
    public String getCouponName() { return couponName; }
    public void setCouponName(String couponName) { this.couponName = couponName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getMinimumSpend() { return minimumSpend; }
    public void setMinimumSpend(BigDecimal minimumSpend) { this.minimumSpend = minimumSpend; }
    public Long getPointsCost() { return pointsCost; }
    public void setPointsCost(Long pointsCost) { this.pointsCost = pointsCost; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getStartTime() { return startTime; }
    public void setStartTime(Date startTime) { this.startTime = startTime; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getEndTime() { return endTime; }
    public void setEndTime(Date endTime) { this.endTime = endTime; }
    public Integer getRemainingStock() { return remainingStock; }
    public void setRemainingStock(Integer remainingStock) { this.remainingStock = remainingStock; }
    public Boolean getExchanged() { return exchanged; }
    public void setExchanged(Boolean exchanged) { this.exchanged = exchanged; }
}
