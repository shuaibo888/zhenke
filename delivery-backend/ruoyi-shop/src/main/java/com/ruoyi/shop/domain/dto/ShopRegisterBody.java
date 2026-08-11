package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopRegisterBody
{
    @NotBlank(message = "请输入用户名")
    @Size(min = 4, max = 20, message = "用户名长度必须在4到20位之间")
    @Pattern(regexp = "^(?!1\\d{10}$)[A-Za-z0-9_]+$", message = "用户名只能包含字母、数字和下划线，且不能使用手机号")
    private String username;

    @NotBlank(message = "请输入密码")
    @Size(min = 6, max = 20, message = "密码长度必须在6到20位之间")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "密码必须同时包含字母和数字")
    private String password;

    private String code;

    private String uuid;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getUuid() { return uuid; }
    public void setUuid(String uuid) { this.uuid = uuid; }
}
