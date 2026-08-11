package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopPhoneBindBody
{
    @NotBlank(message = "请输入手机号")
    @Pattern(regexp = "^1\\d{10}$", message = "请输入11位中国大陆手机号")
    private String phone;
    @NotBlank(message = "请输入短信验证码")
    @Pattern(regexp = "^\\d{4,8}$", message = "短信验证码格式错误")
    private String code;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
