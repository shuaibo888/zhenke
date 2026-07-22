package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopTrialApplyBody;
import com.ruoyi.shop.service.ShopTrialService;

@RestController
@RequestMapping("/shop/trials")
public class ShopTrialController
{
    private final ShopTrialService trialService;
    public ShopTrialController(ShopTrialService trialService) { this.trialService = trialService; }

    @Anonymous
    @GetMapping("/{campaignId}")
    public AjaxResult detail(@PathVariable long campaignId)
    {
        return AjaxResult.success(trialService.publicCampaign(campaignId));
    }

    @PostMapping("/{campaignId}/apply")
    public AjaxResult apply(@PathVariable long campaignId, @Valid @RequestBody ShopTrialApplyBody body)
    {
        return AjaxResult.success("试用申请已提交", trialService.apply(campaignId, body));
    }

    @GetMapping("/me/applications")
    public AjaxResult myApplications()
    {
        return AjaxResult.success(trialService.myApplications());
    }

    @GetMapping("/me/applications/{applicationId}/logistics")
    public AjaxResult logistics(@PathVariable long applicationId)
    {
        return AjaxResult.success(trialService.myApplicationLogistics(applicationId));
    }

    @PutMapping("/me/applications/{applicationId}/received")
    public AjaxResult confirmReceived(@PathVariable long applicationId)
    {
        return AjaxResult.success("已确认收货，现在可以自愿发布验证报告",
                trialService.confirmReceived(applicationId));
    }
}
