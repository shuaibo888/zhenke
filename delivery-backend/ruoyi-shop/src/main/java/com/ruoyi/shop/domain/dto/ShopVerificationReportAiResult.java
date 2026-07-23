package com.ruoyi.shop.domain.dto;

import java.math.BigDecimal;

public record ShopVerificationReportAiResult(
        BigDecimal score,
        String reason,
        Dimensions dimensions)
{
    public record Dimensions(
            BigDecimal authenticity,
            BigDecimal completeness,
            BigDecimal balance,
            BigDecimal decisionValue)
    {
    }
}
