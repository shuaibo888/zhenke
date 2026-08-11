package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopOneClickBody
{
    @NotBlank(message = "缺少一键认证凭证")
    @Size(max = 32768, message = "一键认证凭证格式错误")
    private String spToken;

    public String getSpToken() { return spToken; }
    public void setSpToken(String spToken) { this.spToken = spToken; }
}
