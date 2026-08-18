package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class ShopPointTransferBody
{
    @NotBlank(message = "来源系统不能为空")
    private String sourceSystem;

    @NotNull(message = "划拨数量不能为空")
    @Positive(message = "划拨数量必须为正整数")
    private Long points;

    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }
    public Long getPoints() { return points; }
    public void setPoints(Long points) { this.points = points; }
}
