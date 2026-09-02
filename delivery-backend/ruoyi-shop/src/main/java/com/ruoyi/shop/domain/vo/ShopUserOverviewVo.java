package com.ruoyi.shop.domain.vo;

public class ShopUserOverviewVo
{
    private Long orderCount;
    private Long trialCount;
    private Long reportCount;
    private Long couponAvailableCount;
    private Long pointsBalance;
    private Long postUsefulReceivedCount;
    private Long reportUsefulReceivedCount;
    private Long totalUsefulReceivedCount;

    public Long getOrderCount() { return orderCount; }
    public void setOrderCount(Long orderCount) { this.orderCount = orderCount; }
    public Long getTrialCount() { return trialCount; }
    public void setTrialCount(Long trialCount) { this.trialCount = trialCount; }
    public Long getReportCount() { return reportCount; }
    public void setReportCount(Long reportCount) { this.reportCount = reportCount; }
    public Long getCouponAvailableCount() { return couponAvailableCount; }
    public void setCouponAvailableCount(Long couponAvailableCount) { this.couponAvailableCount = couponAvailableCount; }
    public Long getPointsBalance() { return pointsBalance; }
    public void setPointsBalance(Long pointsBalance) { this.pointsBalance = pointsBalance; }
    public Long getPostUsefulReceivedCount() { return postUsefulReceivedCount; }
    public void setPostUsefulReceivedCount(Long value) { postUsefulReceivedCount = value; }
    public Long getReportUsefulReceivedCount() { return reportUsefulReceivedCount; }
    public void setReportUsefulReceivedCount(Long value) { reportUsefulReceivedCount = value; }
    public Long getTotalUsefulReceivedCount() { return totalUsefulReceivedCount; }
    public void setTotalUsefulReceivedCount(Long value) { totalUsefulReceivedCount = value; }
}
