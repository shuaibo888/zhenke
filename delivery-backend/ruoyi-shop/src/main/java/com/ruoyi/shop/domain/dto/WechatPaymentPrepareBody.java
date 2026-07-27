package com.ruoyi.shop.domain.dto;

public class WechatPaymentPrepareBody
{
    private String code;
    private String state;
    private String returnUrl;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getReturnUrl() { return returnUrl; }
    public void setReturnUrl(String returnUrl) { this.returnUrl = returnUrl; }
}
