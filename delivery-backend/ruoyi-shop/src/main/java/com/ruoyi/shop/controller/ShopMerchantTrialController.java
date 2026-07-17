package com.ruoyi.shop.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopTrialApplication;
import com.ruoyi.shop.domain.ShopTrialCampaign;
import com.ruoyi.shop.domain.dto.ShopTrialAuditBody;
import com.ruoyi.shop.domain.dto.ShopTrialCampaignBody;
import com.ruoyi.shop.domain.dto.ShopTrialCampaignStatusBody;
import com.ruoyi.shop.domain.dto.ShopTrialShipBody;
import com.ruoyi.shop.service.ShopMerchantService;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/merchant/trials")
public class ShopMerchantTrialController extends BaseController
{
    private final ShopTrialService trialService;
    private final ShopMerchantService merchantService;
    public ShopMerchantTrialController(ShopTrialService trialService, ShopMerchantService merchantService)
    {
        this.trialService = trialService;
        this.merchantService = merchantService;
    }

    @PreAuthorize("@ss.hasPermi('shop:trial:list')")
    @GetMapping
    public TableDataInfo list(ShopTrialCampaign query)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        startPage();
        List<ShopTrialCampaign> rows = trialService.merchantCampaigns(merchantId, query);
        return getDataTable(rows);
    }

    @PreAuthorize("@ss.hasPermi('shop:trial:list')")
    @GetMapping("/{campaignId}")
    public AjaxResult detail(@PathVariable long campaignId)
    {
        return AjaxResult.success(trialService.merchantCampaign(campaignId));
    }

    @Log(title = "试用招募", businessType = BusinessType.INSERT)
    @PreAuthorize("@ss.hasPermi('shop:trial:add')")
    @PostMapping
    public AjaxResult create(@Valid @RequestBody ShopTrialCampaignBody body)
    {
        return AjaxResult.success("试用招募已发布", trialService.createCampaigns(body, getUsername()));
    }

    @Log(title = "试用招募状态", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:trial:status')")
    @PutMapping("/{campaignId}/status")
    public AjaxResult status(@PathVariable long campaignId,
            @Valid @RequestBody ShopTrialCampaignStatusBody body)
    {
        return AjaxResult.success(trialService.updateCampaignStatus(campaignId, body.getStatus(), getUsername()));
    }

    @PreAuthorize("@ss.hasPermi('shop:trial:list')")
    @GetMapping("/applications")
    public TableDataInfo applications(@RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) String status)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        startPage();
        List<ShopTrialApplication> rows = trialService.merchantApplications(merchantId, campaignId, status);
        return getDataTable(rows);
    }

    @Log(title = "试用申请审核", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:trial:audit')")
    @PutMapping("/applications/{applicationId}/audit")
    public AjaxResult audit(@PathVariable long applicationId, @Valid @RequestBody ShopTrialAuditBody body)
    {
        return AjaxResult.success(trialService.auditApplication(applicationId, body));
    }

    @Log(title = "线上试用发货", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:trial:ship')")
    @PutMapping("/applications/{applicationId}/ship")
    public AjaxResult ship(@PathVariable long applicationId, @Valid @RequestBody ShopTrialShipBody body)
    {
        return AjaxResult.success(trialService.shipApplication(applicationId, body));
    }
}
