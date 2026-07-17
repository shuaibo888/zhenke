package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public class ShopOrder
{
    private Long orderId;
    private String orderNo;
    private Long userId;
    private String buyerName;
    private Long merchantId;
    private String merchantName;
    private String status;
    private BigDecimal totalAmount;
    private Integer itemCount;
    private String delFlag;
    private Date payTime;
    private String carrier;
    private String trackingNo;
    private Date shipTime;
    private Date receiveTime;
    private Date cancelTime;
    private Date createTime;
    private Date updateTime;
    private List<ShopOrderItem> items;
    private ShopOrderAddress address;
    private List<ShopOrderStatusLog> statusLogs;
    private List<ShopOrderLogisticsEvent> logisticsEvents;

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }
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
    public Date getPayTime() { return payTime; }
    public void setPayTime(Date payTime) { this.payTime = payTime; }
    public String getCarrier() { return carrier; }
    public void setCarrier(String carrier) { this.carrier = carrier; }
    public String getTrackingNo() { return trackingNo; }
    public void setTrackingNo(String trackingNo) { this.trackingNo = trackingNo; }
    public Date getShipTime() { return shipTime; }
    public void setShipTime(Date shipTime) { this.shipTime = shipTime; }
    public Date getReceiveTime() { return receiveTime; }
    public void setReceiveTime(Date receiveTime) { this.receiveTime = receiveTime; }
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
    public List<ShopOrderLogisticsEvent> getLogisticsEvents() { return logisticsEvents; }
    public void setLogisticsEvents(List<ShopOrderLogisticsEvent> logisticsEvents) { this.logisticsEvents = logisticsEvents; }
}
