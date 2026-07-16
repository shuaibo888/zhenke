package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public class ShopOrder
{
    private Long orderId;
    private String orderNo;
    private Long userId;
    private Long merchantId;
    private String merchantName;
    private String status;
    private BigDecimal totalAmount;
    private Integer itemCount;
    private String delFlag;
    private Date cancelTime;
    private Date createTime;
    private Date updateTime;
    private List<ShopOrderItem> items;
    private ShopOrderAddress address;
    private List<ShopOrderStatusLog> statusLogs;

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public Integer getItemCount() { return itemCount; }
    public void setItemCount(Integer itemCount) { this.itemCount = itemCount; }
    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
    public Date getCancelTime() { return cancelTime; }
    public void setCancelTime(Date cancelTime) { this.cancelTime = cancelTime; }
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
    public Date getUpdateTime() { return updateTime; }
    public void setUpdateTime(Date updateTime) { this.updateTime = updateTime; }
    public List<ShopOrderItem> getItems() { return items; }
    public void setItems(List<ShopOrderItem> items) { this.items = items; }
    public ShopOrderAddress getAddress() { return address; }
    public void setAddress(ShopOrderAddress address) { this.address = address; }
    public List<ShopOrderStatusLog> getStatusLogs() { return statusLogs; }
    public void setStatusLogs(List<ShopOrderStatusLog> statusLogs) { this.statusLogs = statusLogs; }
}
