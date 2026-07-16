package com.ruoyi.shop.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/merchant/reports")
public class ShopMerchantReportController
{
    private final ShopTrialService trialService;
    public ShopMerchantReportController(ShopTrialService trialService) { this.trialService = trialService; }

    @PreAuthorize("@ss.hasPermi('shop:report:list')")
    @GetMapping
    public AjaxResult list()
    {
        return AjaxResult.success(trialService.merchantReports());
    }
}
