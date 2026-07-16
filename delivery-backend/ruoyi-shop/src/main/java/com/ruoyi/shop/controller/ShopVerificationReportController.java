package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopVerificationReportBody;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/reports")
public class ShopVerificationReportController
{
    private final ShopTrialService trialService;
    public ShopVerificationReportController(ShopTrialService trialService) { this.trialService = trialService; }

    @Anonymous
    @GetMapping("/{reportId}")
    public AjaxResult detail(@PathVariable long reportId)
    {
        return AjaxResult.success(trialService.publishedReport(reportId));
    }

    @PostMapping
    public AjaxResult publish(@Valid @RequestBody ShopVerificationReportBody body)
    {
        return AjaxResult.success("验证报告已发布", trialService.publishReport(body));
    }

    @GetMapping("/me/list")
    public AjaxResult myReports()
    {
        return AjaxResult.success(trialService.myReports());
    }
}
