package com.ruoyi.shop.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.enums.BusinessType;
import jakarta.validation.Valid;
import com.ruoyi.shop.domain.ShopTrialApplication;
import com.ruoyi.shop.domain.ShopTrialCampaign;
import com.ruoyi.shop.domain.dto.ShopTrialAuditBody;
import com.ruoyi.shop.domain.dto.ShopTrialCampaignStatusBody;
import com.ruoyi.shop.domain.dto.ShopTrialRedeemBody;
import com.ruoyi.shop.domain.dto.ShopTrialShipBody;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/admin/trials")
@PreAuthorize("@ss.hasRole('admin')")
public class ShopTrialAdminController extends BaseController
{
    private final ShopTrialService trialService;
    public ShopTrialAdminController(ShopTrialService trialService) { this.trialService = trialService; }

    @PreAuthorize("@ss.hasRole('admin')")
    @GetMapping
    public TableDataInfo list(ShopTrialCampaign query,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize)
    {
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopTrialCampaign> rows = trialService.adminCampaigns(query);
        return getDataTable(rows);
    }

    @PreAuthorize("@ss.hasRole('admin')")
    @GetMapping("/{campaignId}")
    public AjaxResult detail(@PathVariable long campaignId)
    {
        return AjaxResult.success(trialService.adminCampaign(campaignId));
    }

    @Log(title = "平台管理试用招募状态", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasRole('admin')")
    @PutMapping("/{campaignId}/status")
    public AjaxResult status(@PathVariable long campaignId,
            @Valid @RequestBody ShopTrialCampaignStatusBody body)
    {
        return AjaxResult.success(trialService.adminUpdateCampaignStatus(
                campaignId, body.getStatus(), getUsername()));
    }

    @PreAuthorize("@ss.hasRole('admin')")
    @GetMapping("/applications")
    public TableDataInfo applications(@RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize)
    {
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopTrialApplication> rows = trialService.adminApplications(campaignId, status);
        return getDataTable(rows);
    }

    @Log(title = "平台管理试用申请审核", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasRole('admin')")
    @PutMapping("/applications/{applicationId}/audit")
    public AjaxResult audit(@PathVariable long applicationId, @Valid @RequestBody ShopTrialAuditBody body)
    {
        return AjaxResult.success(trialService.adminAuditApplication(applicationId, body));
    }

    @Log(title = "平台管理线上试用发货", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasRole('admin')")
    @PutMapping("/applications/{applicationId}/ship")
    public AjaxResult ship(@PathVariable long applicationId, @Valid @RequestBody ShopTrialShipBody body)
    {
        return AjaxResult.success(trialService.adminShipApplication(applicationId, body));
    }

    @Log(title = "平台管理线下试用核销", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasRole('admin')")
    @PostMapping("/applications/redeem")
    public AjaxResult redeem(@Valid @RequestBody ShopTrialRedeemBody body)
    {
        return AjaxResult.success("线下试用已核销，用户现在可以发布甄客验",
                trialService.adminRedeemApplication(body.getRedeemCode()));
    }
}
