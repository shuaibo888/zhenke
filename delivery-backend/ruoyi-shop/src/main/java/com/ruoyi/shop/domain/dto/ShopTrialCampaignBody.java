package com.ruoyi.shop.domain.dto;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopTrialCampaignBody
{
    @NotNull(message = "请选择试用商品")
    private Long productId;
    @NotBlank(message = "请输入招募标题")
    @Size(max = 120, message = "招募标题不能超过120个字符")
    private String campaignTitle;
    @NotBlank(message = "请输入招募说明")
    @Size(max = 500, message = "招募说明不能超过500个字符")
    private String campaignSummary;
    @NotNull(message = "请输入试用人数")
    @Min(value = 1, message = "试用人数至少为1人")
    @Max(value = 10000, message = "试用人数不能超过10000人")
    private Integer targetCount;
    @NotNull(message = "请选择申请截止时间")
    @Future(message = "申请截止时间必须晚于当前时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date applicationDeadline;

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getCampaignTitle() { return campaignTitle; }
    public void setCampaignTitle(String campaignTitle) { this.campaignTitle = campaignTitle; }
    public String getCampaignSummary() { return campaignSummary; }
    public void setCampaignSummary(String campaignSummary) { this.campaignSummary = campaignSummary; }
    public Integer getTargetCount() { return targetCount; }
    public void setTargetCount(Integer targetCount) { this.targetCount = targetCount; }
    public Date getApplicationDeadline() { return applicationDeadline; }
    public void setApplicationDeadline(Date applicationDeadline) { this.applicationDeadline = applicationDeadline; }
}
