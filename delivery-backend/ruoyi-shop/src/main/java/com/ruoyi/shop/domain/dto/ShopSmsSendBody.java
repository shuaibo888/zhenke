package com.ruoyi.shop.domain.dto;

import com.ruoyi.shop.phone.PhoneVerificationScene;
import jakarta.validation.constraints.NotNull;

public class ShopSmsSendBody
{
    private String phone;

    @NotNull(message = "请选择短信验证场景")
    private PhoneVerificationScene scene;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public PhoneVerificationScene getScene() { return scene; }
    public void setScene(PhoneVerificationScene scene) { this.scene = scene; }
}
