package com.ruoyi.shop.domain.vo;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopHomeTrialSummary
{
    private String trialType;
    private Integer targetCount;
    private Integer approvedCount;
    private Date applicationDeadline;
    public String getTrialType() { return trialType; }
    public void setTrialType(String trialType) { this.trialType = trialType; }
    public Integer getTargetCount() { return targetCount; }
    public void setTargetCount(Integer targetCount) { this.targetCount = targetCount; }
    public Integer getApprovedCount() { return approvedCount; }
    public void setApprovedCount(Integer approvedCount) { this.approvedCount = approvedCount; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getApplicationDeadline() { return applicationDeadline; }
    public void setApplicationDeadline(Date applicationDeadline) { this.applicationDeadline = applicationDeadline; }
}
