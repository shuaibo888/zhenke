package com.ruoyi.shop.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopPointRecord
{
    private Long pointRecordId;
    private Long changeAmount;
    private Long balanceAfter;
    private String changeReason;
    private String sourceSystem;
    private String sourceName;
    private Date createTime;

    public Long getPointRecordId() { return pointRecordId; }
    public void setPointRecordId(Long pointRecordId) { this.pointRecordId = pointRecordId; }
    public Long getChangeAmount() { return changeAmount; }
    public void setChangeAmount(Long changeAmount) { this.changeAmount = changeAmount; }
    public Long getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(Long balanceAfter) { this.balanceAfter = balanceAfter; }
    public String getChangeReason() { return changeReason; }
    public void setChangeReason(String changeReason) { this.changeReason = changeReason; }
    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
}
