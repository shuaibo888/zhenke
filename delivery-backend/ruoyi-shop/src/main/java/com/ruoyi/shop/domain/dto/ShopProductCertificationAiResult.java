package com.ruoyi.shop.domain.dto;

import java.math.BigDecimal;
import java.util.List;

public record ShopProductCertificationAiResult(
        Decision decision,
        BigDecimal confidence,
        List<String> matchedFields,
        List<String> missingFields,
        List<String> riskFlags,
        String merchantReason,
        String publicSummary,
        String materialValidUntil)
{
    public enum Decision { PASS, REJECT }
}
