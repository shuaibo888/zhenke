package com.ruoyi.shop.service;

import org.springframework.stereotype.Service;
import com.ruoyi.shop.domain.vo.ShopDashboardSummary;
import com.ruoyi.shop.mapper.ShopDashboardMapper;

@Service
public class ShopDashboardService
{
    private final ShopDashboardMapper dashboardMapper;
    private final ShopMerchantService merchantService;

    public ShopDashboardService(ShopDashboardMapper dashboardMapper, ShopMerchantService merchantService)
    {
        this.dashboardMapper = dashboardMapper;
        this.merchantService = merchantService;
    }

    public ShopDashboardSummary adminSummary()
    {
        return summary(null);
    }

    public ShopDashboardSummary merchantSummary()
    {
        return summary(merchantService.currentMerchantAccount().getMerchantId());
    }

    private ShopDashboardSummary summary(Long merchantId)
    {
        ShopDashboardSummary summary = dashboardMapper.selectSummary(merchantId);
        summary.setOrderStatusCounts(dashboardMapper.selectOrderStatusCounts(merchantId));
        summary.setProductStatusCounts(dashboardMapper.selectProductStatusCounts(merchantId));
        summary.setOrderDailyCounts(dashboardMapper.selectOrderDailyCounts(merchantId));
        return summary;
    }
}
