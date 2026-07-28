package com.ruoyi.shop.domain.vo;

import java.math.BigDecimal;
import java.util.List;

public class ShopDashboardSummary
{
    private Long productTotal;
    private Long onSaleCount;
    private Long orderTotal;
    private Long todayOrders;
    private BigDecimal salesAmount;
    private Long userTotal;
    private Long reportTotal;
    private List<ShopDashboardCount> orderStatusCounts;
    private List<ShopDashboardCount> productStatusCounts;
    private List<ShopDashboardDailyCount> orderDailyCounts;

    public Long getProductTotal() { return productTotal; }
    public void setProductTotal(Long productTotal) { this.productTotal = productTotal; }
    public Long getOnSaleCount() { return onSaleCount; }
    public void setOnSaleCount(Long onSaleCount) { this.onSaleCount = onSaleCount; }
    public Long getOrderTotal() { return orderTotal; }
    public void setOrderTotal(Long orderTotal) { this.orderTotal = orderTotal; }
    public Long getTodayOrders() { return todayOrders; }
    public void setTodayOrders(Long todayOrders) { this.todayOrders = todayOrders; }
    public BigDecimal getSalesAmount() { return salesAmount; }
    public void setSalesAmount(BigDecimal salesAmount) { this.salesAmount = salesAmount; }
    public Long getUserTotal() { return userTotal; }
    public void setUserTotal(Long userTotal) { this.userTotal = userTotal; }
    public Long getReportTotal() { return reportTotal; }
    public void setReportTotal(Long reportTotal) { this.reportTotal = reportTotal; }
    public List<ShopDashboardCount> getOrderStatusCounts() { return orderStatusCounts; }
    public void setOrderStatusCounts(List<ShopDashboardCount> orderStatusCounts) { this.orderStatusCounts = orderStatusCounts; }
    public List<ShopDashboardCount> getProductStatusCounts() { return productStatusCounts; }
    public void setProductStatusCounts(List<ShopDashboardCount> productStatusCounts) { this.productStatusCounts = productStatusCounts; }
    public List<ShopDashboardDailyCount> getOrderDailyCounts() { return orderDailyCounts; }
    public void setOrderDailyCounts(List<ShopDashboardDailyCount> orderDailyCounts) { this.orderDailyCounts = orderDailyCounts; }
}
