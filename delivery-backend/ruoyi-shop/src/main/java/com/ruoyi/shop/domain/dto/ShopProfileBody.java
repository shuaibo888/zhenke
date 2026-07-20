package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.Size;

public class ShopProfileBody
{
    @Size(min = 1, max = 30, message = "昵称长度必须在1到30位之间")
    private String nickname;
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
}
