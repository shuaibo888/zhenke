package com.ruoyi.shop.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.service.ShopMerchantService;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/merchant/reports")
public class ShopMerchantReportController extends BaseController
{
    private final ShopTrialService trialService;
    private final ShopMerchantService merchantService;
    public ShopMerchantReportController(ShopTrialService trialService, ShopMerchantService merchantService)
    {
        this.trialService = trialService;
        this.merchantService = merchantService;
    }

    @PreAuthorize("@ss.hasPermi('shop:report:list')")
    @GetMapping
    public TableDataInfo list(@RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopVerificationReport> rows = trialService.merchantReports(merchantId);
        return getDataTable(rows);
    }
}
