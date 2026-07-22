package com.ruoyi.shop.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.service.ShopMerchantService;

@RestController
@RequestMapping("/shop/merchant/account")
public class ShopMerchantAccountController {
    private final ShopMerchantService merchantService;

    public ShopMerchantAccountController(ShopMerchantService merchantService) {
        this.merchantService = merchantService;
    }

    @PreAuthorize("@ss.hasPermi('shop:merchant:self')")
    @GetMapping("/me")
    public AjaxResult currentMerchant() {
        return AjaxResult.success(merchantService.currentMerchantAccount());
    }
}
