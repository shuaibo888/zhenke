package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopSsoLoginBody
{
    @NotBlank(message = "登录票据不能为空")
    @Size(max = 512, message = "登录票据格式错误")
    private String ticket;

    public String getTicket()
    {
        return ticket;
    }

    public void setTicket(String ticket)
    {
        this.ticket = ticket;
    }
}
