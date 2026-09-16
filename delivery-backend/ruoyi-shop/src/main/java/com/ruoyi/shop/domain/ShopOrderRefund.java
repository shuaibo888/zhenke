package com.ruoyi.shop.domain;

import java.util.Date;

public class ShopOrderRefund
{
    private String refundType;
    public String getRefundType() { return refundType; }
    public void setRefundType(String refundType) { this.refundType = refundType; }
    private String returnRecipient;
    public String getReturnRecipient() { return returnRecipient; }
    public void setReturnRecipient(String returnRecipient) { this.returnRecipient = returnRecipient; }
    private String returnPhone;
    public String getReturnPhone() { return returnPhone; }
    public void setReturnPhone(String returnPhone) { this.returnPhone = returnPhone; }
    private String returnAddress;
    public String getReturnAddress() { return returnAddress; }
    public void setReturnAddress(String returnAddress) { this.returnAddress = returnAddress; }
    private String returnTrackingNo;
    public String getReturnTrackingNo() { return returnTrackingNo; }
    public void setReturnTrackingNo(String returnTrackingNo) { this.returnTrackingNo = returnTrackingNo; }
    private Date returnShipTime;
    public Date getReturnShipTime() { return returnShipTime; }
    public void setReturnShipTime(Date returnShipTime) { this.returnShipTime = returnShipTime; }
    private Date returnReceiveTime;
    public Date getReturnReceiveTime() { return returnReceiveTime; }
    public void setReturnReceiveTime(Date returnReceiveTime) { this.returnReceiveTime = returnReceiveTime; }

    private Long refundId;
    private Long orderId;
    private Long userId;
    private Long merchantId;
    private String refundStatus;
    private String refundReason;
    private String reviewRequired;
    private String auditRemark;
    private Long auditBy;
    private Date requestTime;
    private Date auditTime;
    private Date refundTime;
    private String outRefundNo;
    private String wechatRefundId;
    private String channelStatus;
    private String channelError;
    private Date channelLastAttemptTime;
    private Date createTime;
    private Date updateTime;

    public Long getRefundId() { return refundId; }
    public void setRefundId(Long refundId) { this.refundId = refundId; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }
    public String getRefundReason() { return refundReason; }
    public void setRefundReason(String refundReason) { this.refundReason = refundReason; }
    public String getReviewRequired() { return reviewRequired; }
    public void setReviewRequired(String reviewRequired) { this.reviewRequired = reviewRequired; }
    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }
    public Long getAuditBy() { return auditBy; }
    public void setAuditBy(Long auditBy) { this.auditBy = auditBy; }
    public Date getRequestTime() { return requestTime; }
    public void setRequestTime(Date requestTime) { this.requestTime = requestTime; }
    public Date getAuditTime() { return auditTime; }
    public void setAuditTime(Date auditTime) { this.auditTime = auditTime; }
    public Date getRefundTime() { return refundTime; }
    public void setRefundTime(Date refundTime) { this.refundTime = refundTime; }
    public String getOutRefundNo() { return outRefundNo; }
    public void setOutRefundNo(String outRefundNo) { this.outRefundNo = outRefundNo; }
    public String getWechatRefundId() { return wechatRefundId; }
    public void setWechatRefundId(String wechatRefundId) { this.wechatRefundId = wechatRefundId; }
    public String getChannelStatus() { return channelStatus; }
    public void setChannelStatus(String channelStatus) { this.channelStatus = channelStatus; }
    public String getChannelError() { return channelError; }
    public void setChannelError(String channelError) { this.channelError = channelError; }
    public Date getChannelLastAttemptTime() { return channelLastAttemptTime; }
    public void setChannelLastAttemptTime(Date channelLastAttemptTime) { this.channelLastAttemptTime = channelLastAttemptTime; }
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
    public Date getUpdateTime() { return updateTime; }
    public void setUpdateTime(Date updateTime) { this.updateTime = updateTime; }
}
