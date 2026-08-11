package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopPhoneChangeBody
{
    @NotBlank(message = "请输入新手机号")
    @Pattern(regexp = "^1\\d{10}$", message = "请输入11位中国大陆手机号")
    private String newPhone;
    @NotBlank(message = "请输入新手机号验证码")
    @Pattern(regexp = "^\\d{4,8}$", message = "新手机号验证码格式错误")
    private String newPhoneCode;

    public String getNewPhone() { return newPhone; }
    public void setNewPhone(String newPhone) { this.newPhone = newPhone; }
    public String getNewPhoneCode() { return newPhoneCode; }
    public void setNewPhoneCode(String newPhoneCode) { this.newPhoneCode = newPhoneCode; }
}
