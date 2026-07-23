package com.ruoyi.shop.mapper;

import java.math.BigDecimal;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopVerificationReportAiScore;

public interface ShopVerificationReportAiScoreMapper
{
    List<Long> selectPendingReportIds(@Param("maxAttempts") int maxAttempts,
                                      @Param("limit") int limit);

    int claimReport(@Param("reportId") long reportId,
                    @Param("promptVersion") String promptVersion,
                    @Param("inputHash") String inputHash,
                    @Param("maxAttempts") int maxAttempts);

    int insertAttempt(ShopVerificationReportAiScore attempt);

    int bindRunningAttempt(@Param("reportId") long reportId,
                           @Param("scoreId") long scoreId,
                           @Param("promptVersion") String promptVersion,
                           @Param("inputHash") String inputHash);

    int completeAttempt(@Param("scoreId") long scoreId,
                        @Param("score") BigDecimal score,
                        @Param("reason") String reason,
                        @Param("dimensionsJson") String dimensionsJson);

    int failAttempt(@Param("scoreId") long scoreId,
                    @Param("errorMessage") String errorMessage);

    int completeReport(@Param("reportId") long reportId,
                       @Param("scoreId") long scoreId,
                       @Param("promptVersion") String promptVersion,
                       @Param("inputHash") String inputHash,
                       @Param("score") BigDecimal score);

    int failReport(@Param("reportId") long reportId,
                   @Param("scoreId") long scoreId,
                   @Param("promptVersion") String promptVersion,
                   @Param("inputHash") String inputHash,
                   @Param("maxAttempts") int maxAttempts,
                   @Param("retryDelaySeconds") int retryDelaySeconds);

    int failStaleAttempts(@Param("runningTimeoutMinutes") int runningTimeoutMinutes);

    int recoverStaleReports(@Param("runningTimeoutMinutes") int runningTimeoutMinutes,
                            @Param("maxAttempts") int maxAttempts,
                            @Param("retryDelaySeconds") int retryDelaySeconds);

    int retryReport(@Param("reportId") long reportId);

    int queueBackfill();
}
