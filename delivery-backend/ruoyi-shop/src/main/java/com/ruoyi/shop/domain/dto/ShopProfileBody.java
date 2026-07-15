package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.Size;

public class ShopProfileBody
{
    @Size(min = 1, max = 30, message = "昵称长度必须在1到30位之间")
    private String nickname;
    @Size(max = 500, message = "头像地址不能超过500个字符")
    private String avatar;
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
}
