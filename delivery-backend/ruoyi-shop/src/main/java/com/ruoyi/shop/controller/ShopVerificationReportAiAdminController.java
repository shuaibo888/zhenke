package com.ruoyi.shop.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.ai.ShopVerificationReportAiScoreService;

@RestController
@RequestMapping("/shop/admin/reports/ai-score")
@PreAuthorize("@ss.hasRole('admin')")
public class ShopVerificationReportAiAdminController
{
    private final ShopVerificationReportAiScoreService scoreService;

    public ShopVerificationReportAiAdminController(ShopVerificationReportAiScoreService scoreService)
    {
        this.scoreService = scoreService;
    }

    @PostMapping("/backfill")
    public AjaxResult backfill()
    {
        int queued = scoreService.queueHistoricalReports();
        return AjaxResult.success("历史甄客验已加入待评分队列", queued);
    }

    @PostMapping("/{reportId}/retry")
    public AjaxResult retry(@PathVariable long reportId)
    {
        scoreService.retryReport(reportId);
        return AjaxResult.success("甄客验已重新加入评分队列");
    }
}
