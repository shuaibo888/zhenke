package com.ruoyi.shop.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.service.ShopDashboardService;

@RestController
@RequestMapping("/shop")
public class ShopDashboardController
{
    private final ShopDashboardService dashboardService;

    public ShopDashboardController(ShopDashboardService dashboardService)
    {
        this.dashboardService = dashboardService;
    }

    @PreAuthorize("@ss.hasRole('admin')")
    @GetMapping("/admin/dashboard")
    public AjaxResult admin()
    {
        return AjaxResult.success(dashboardService.adminSummary());
    }

    @PreAuthorize("@ss.hasRole('merchant')")
    @GetMapping("/merchant/dashboard")
    public AjaxResult merchant()
    {
        return AjaxResult.success(dashboardService.merchantSummary());
    }
}
