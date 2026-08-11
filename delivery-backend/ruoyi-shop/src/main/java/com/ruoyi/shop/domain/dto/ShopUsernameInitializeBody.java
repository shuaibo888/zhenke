package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopUsernameInitializeBody
{
    @NotBlank(message = "请输入账号名")
    @Size(min = 4, max = 20, message = "账号名长度必须在4到20位之间")
    @Pattern(regexp = "^(?!1\\d{10}$)[A-Za-z0-9_]+$", message = "账号名只能包含字母、数字和下划线，且不能使用手机号")
    private String username;

    @AssertTrue(message = "请确认账号名设置后不可修改")
    private boolean permanentConfirmed;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public boolean isPermanentConfirmed() { return permanentConfirmed; }
    public void setPermanentConfirmed(boolean permanentConfirmed) { this.permanentConfirmed = permanentConfirmed; }
}
