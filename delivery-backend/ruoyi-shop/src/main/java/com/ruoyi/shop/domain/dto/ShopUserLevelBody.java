package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotNull;

public class ShopUserLevelBody
{
    @NotNull(message = "请选择会员等级")
    private Long levelId;

    public Long getLevelId() { return levelId; }
    public void setLevelId(Long levelId) { this.levelId = levelId; }
}
