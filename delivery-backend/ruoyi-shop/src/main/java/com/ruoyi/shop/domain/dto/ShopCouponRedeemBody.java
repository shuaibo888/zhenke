package com.ruoyi.shop.domain.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopCouponRedeemBody
{
    @NotBlank(message = "核销码不能为空")
    @Size(max = 64, message = "核销码不能超过64个字符")
    private String redeemCode;

    @DecimalMin(value = "0.00", message = "消费金额不能小于0")
    @Digits(integer = 8, fraction = 2, message = "消费金额最多8位整数和2位小数")
    private BigDecimal consumptionAmount;

    public String getRedeemCode() { return redeemCode; }
    public void setRedeemCode(String redeemCode) { this.redeemCode = redeemCode; }
    public BigDecimal getConsumptionAmount() { return consumptionAmount; }
    public void setConsumptionAmount(BigDecimal consumptionAmount) { this.consumptionAmount = consumptionAmount; }
}
