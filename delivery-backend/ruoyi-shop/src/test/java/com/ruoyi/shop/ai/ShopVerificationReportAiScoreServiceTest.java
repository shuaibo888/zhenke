package com.ruoyi.shop.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

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
}
