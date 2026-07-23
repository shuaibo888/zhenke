package com.ruoyi.shop.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.ruoyi.shop.ai.ShopVerificationReportAiScoreService;

@Component
public class ShopVerificationReportAiScoreScheduler
{
    private static final Logger log = LoggerFactory.getLogger(ShopVerificationReportAiScoreScheduler.class);
    private final ShopVerificationReportAiScoreService scoreService;

    public ShopVerificationReportAiScoreScheduler(ShopVerificationReportAiScoreService scoreService)
    {
        this.scoreService = scoreService;
    }

    @Scheduled(initialDelayString = "${shop.ai-score.initial-delay-ms:15000}",
            fixedDelayString = "${shop.ai-score.scan-delay-ms:15000}")
    public void scorePendingReports()
    {
        try
        {
            scoreService.processPendingBatch();
        }
        catch (Exception exception)
        {
            log.error("扫描甄客验AI评分任务失败", exception);
        }
    }
}
