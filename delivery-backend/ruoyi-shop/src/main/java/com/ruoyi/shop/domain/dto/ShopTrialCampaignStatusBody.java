package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopTrialCampaignStatusBody
{
    @NotBlank(message = "请选择活动状态")
    @Pattern(regexp = "RECRUITING|CLOSED|FINISHED", message = "活动状态无效")
    private String status;
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
