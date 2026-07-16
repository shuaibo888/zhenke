package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopTrialApplyBody
{
    @NotBlank(message = "请输入申请理由")
    @Size(max = 1000, message = "申请理由不能超过1000个字符")
    private String applyReason;
    @NotBlank(message = "请输入收件人")
    @Size(max = 30, message = "收件人不能超过30个字符")
    private String recipientName;
    @NotBlank(message = "请输入联系电话")
    @Size(max = 20, message = "联系电话不能超过20个字符")
    @Pattern(regexp = "^[0-9+()\\s\\-]{6,20}$", message = "联系电话格式不正确")
    private String recipientPhone;
    @NotBlank(message = "请输入收货地址")
    @Size(max = 500, message = "收货地址不能超过500个字符")
    private String shippingAddress;

    public String getApplyReason() { return applyReason; }
    public void setApplyReason(String applyReason) { this.applyReason = applyReason; }
    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }
    public String getRecipientPhone() { return recipientPhone; }
    public void setRecipientPhone(String recipientPhone) { this.recipientPhone = recipientPhone; }
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
}
