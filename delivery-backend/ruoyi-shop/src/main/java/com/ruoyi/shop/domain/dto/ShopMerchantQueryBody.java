package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopMerchantQueryBody
{
    @NotBlank(message = "请输入申请手机号")
    @Pattern(regexp = "^1\\d{10}$", message = "请输入11位手机号")
    private String contactPhone;

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
}
