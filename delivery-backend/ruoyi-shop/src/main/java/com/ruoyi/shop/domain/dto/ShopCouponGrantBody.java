package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopCouponGrantBody
{
    @NotEmpty(message = "请至少选择一个下发用户")
    @Size(max = 200, message = "单次最多选择200个用户")
    private List<@NotNull(message = "下发用户不能为空") Long> userIds;

    @NotNull(message = "请输入每位用户的下发张数")
    @Min(value = 1, message = "每位用户至少下发1张")
    @Max(value = 100, message = "每位用户单次最多下发100张")
    private Integer quantityPerUser;

    public List<Long> getUserIds() { return userIds; }
    public void setUserIds(List<Long> userIds) { this.userIds = userIds; }
    public Integer getQuantityPerUser() { return quantityPerUser; }
    public void setQuantityPerUser(Integer quantityPerUser) { this.quantityPerUser = quantityPerUser; }
}
