package com.ruoyi.shop.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopCouponGrant
{
    private Long grantId;
    private Long couponId;
    private Integer userCount;
    private Integer quantityPerUser;
    private Integer totalQuantity;
    private String grantType;
    private String triggerCode;
    private Long operatorId;
    private String operatorName;
    private Date createTime;

    public Long getGrantId() { return grantId; }
    public void setGrantId(Long grantId) { this.grantId = grantId; }
    public Long getCouponId() { return couponId; }
    public void setCouponId(Long couponId) { this.couponId = couponId; }
    public Integer getUserCount() { return userCount; }
    public void setUserCount(Integer userCount) { this.userCount = userCount; }
    public Integer getQuantityPerUser() { return quantityPerUser; }
    public void setQuantityPerUser(Integer quantityPerUser) { this.quantityPerUser = quantityPerUser; }
    public Integer getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
    public String getGrantType() { return grantType; }
    public void setGrantType(String grantType) { this.grantType = grantType; }
    public String getTriggerCode() { return triggerCode; }
    public void setTriggerCode(String triggerCode) { this.triggerCode = triggerCode; }
    public Long getOperatorId() { return operatorId; }
    public void setOperatorId(Long operatorId) { this.operatorId = operatorId; }
    public String getOperatorName() { return operatorName; }
    public void setOperatorName(String operatorName) { this.operatorName = operatorName; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
}
