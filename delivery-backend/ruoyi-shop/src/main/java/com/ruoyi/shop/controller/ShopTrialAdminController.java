package com.ruoyi.shop.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.ShopTrialCampaign;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/admin/trials")
public class ShopTrialAdminController extends BaseController
{
    private final ShopTrialService trialService;
    public ShopTrialAdminController(ShopTrialService trialService) { this.trialService = trialService; }

    @PreAuthorize("@ss.hasPermi('shop:trial:list')")
    @GetMapping
    public TableDataInfo list(ShopTrialCampaign query,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize)
    {
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopTrialCampaign> rows = trialService.adminCampaigns(query);
        return getDataTable(rows);
    }
}
