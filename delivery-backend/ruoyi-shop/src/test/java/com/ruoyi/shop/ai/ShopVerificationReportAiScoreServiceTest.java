package com.ruoyi.shop.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import com.ruoyi.shop.domain.dto.ShopVerificationReportAiResult.ProductMatch;

class ShopVerificationReportAiScoreServiceTest
{
    @Test
    void roundsScoresToOneDecimalWithHalfUp()
    {
        assertEquals(new BigDecimal("4.2"),
                ShopVerificationReportAiScoreService.normalizeScore(new BigDecimal("4.24"), "score"));
        assertEquals(new BigDecimal("4.3"),
                ShopVerificationReportAiScoreService.normalizeScore(new BigDecimal("4.25"), "score"));
        assertEquals(new BigDecimal("5.0"),
                ShopVerificationReportAiScoreService.normalizeScore(new BigDecimal("5"), "score"));
    }

    @Test
    void rejectsMissingAndOutOfRangeScores()
    {
        assertThrows(IllegalArgumentException.class,
                () -> ShopVerificationReportAiScoreService.normalizeScore(null, "score"));
        assertThrows(IllegalArgumentException.class,
                () -> ShopVerificationReportAiScoreService.normalizeScore(new BigDecimal("-0.1"), "score"));
        assertThrows(IllegalArgumentException.class,
                () -> ShopVerificationReportAiScoreService.normalizeScore(new BigDecimal("5.1"), "score"));
    }

    @Test
    void computesWeightedScoreAndEnforcesProductMatchCaps()
    {
        Map<String, BigDecimal> dimensions = new LinkedHashMap<>();
        dimensions.put("authenticity", new BigDecimal("5.0"));
        dimensions.put("completeness", new BigDecimal("5.0"));
        dimensions.put("balance", new BigDecimal("4.0"));
        dimensions.put("decisionValue", new BigDecimal("4.0"));

        BigDecimal weighted = ShopVerificationReportAiScoreService.calculateWeightedScore(dimensions);
        assertEquals(new BigDecimal("4.6"), weighted);
        assertEquals(new BigDecimal("4.6"),
                ShopVerificationReportAiScoreService.applyProductMatchCap(weighted, ProductMatch.MATCH));
        assertEquals(new BigDecimal("2.0"),
                ShopVerificationReportAiScoreService.applyProductMatchCap(weighted, ProductMatch.UNCERTAIN));
        assertEquals(new BigDecimal("1.0"),
                ShopVerificationReportAiScoreService.applyProductMatchCap(weighted, ProductMatch.MISMATCH));
    }
}
