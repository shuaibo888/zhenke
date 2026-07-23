package com.ruoyi.shop.domain.dto;

import java.math.BigDecimal;

public record ShopVerificationReportAiResult(
        ProductMatch productMatch,
        String productMatchReason,
        String reason,
        Dimensions dimensions)
{
    public enum ProductMatch
    {
        MATCH,
        MISMATCH,
        UNCERTAIN
    }

    public record Dimensions(
            BigDecimal authenticity,
            BigDecimal completeness,
            BigDecimal balance,
            BigDecimal decisionValue)
    {
    }
}
