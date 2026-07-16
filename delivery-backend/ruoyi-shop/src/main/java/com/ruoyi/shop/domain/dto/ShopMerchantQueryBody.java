package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;

public class ShopMerchantQueryBody
{
    @NotBlank(message = "缺少申请编号")
    private String applicationNo;

    @NotBlank(message = "缺少申请查询凭证")
    private String queryToken;

    public String getApplicationNo() { return applicationNo; }
    public void setApplicationNo(String applicationNo) { this.applicationNo = applicationNo; }
    public String getQueryToken() { return queryToken; }
    public void setQueryToken(String queryToken) { this.queryToken = queryToken; }
}
