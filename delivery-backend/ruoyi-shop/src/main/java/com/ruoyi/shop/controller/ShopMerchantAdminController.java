package com.ruoyi.shop.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.dto.ShopMerchantAuditBody;
import com.ruoyi.shop.domain.dto.ShopMerchantStatusBody;
import com.ruoyi.shop.service.ShopMerchantService;

@RestController
@RequestMapping("/shop/admin/merchants")
public class ShopMerchantAdminController extends BaseController {
    private final ShopMerchantService merchantService;

    public ShopMerchantAdminController(ShopMerchantService merchantService) {
        this.merchantService = merchantService;
    }

    @PreAuthorize("@ss.hasPermi('shop:merchant:list')")
    @GetMapping
    public TableDataInfo list(ShopMerchant query) {
        startPage();
        List<ShopMerchant> merchants = merchantService.selectAdminList(query);
        return getDataTable(merchants);
    }

    @PreAuthorize("@ss.hasPermi('shop:merchant:query')")
    @GetMapping("/{merchantId}")
    public AjaxResult detail(@PathVariable long merchantId) {
        return AjaxResult.success(merchantService.detail(merchantId));
    }

    @Log(title = "商家入驻审核", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:merchant:audit')")
    @PutMapping("/{merchantId}/audit")
    public AjaxResult audit(@PathVariable long merchantId, @Valid @RequestBody ShopMerchantAuditBody body) {
        return AjaxResult.success(merchantService.audit(merchantId, body, getUsername()));
    }

    @Log(title = "商家状态", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:merchant:status')")
    @PutMapping("/{merchantId}/status")
    public AjaxResult updateStatus(@PathVariable long merchantId, @Valid @RequestBody ShopMerchantStatusBody body) {
        return toAjax(merchantService.updateStatus(merchantId, body.getStatus(), getUsername()));
    }
}
