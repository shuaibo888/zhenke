package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopMerchantApplyBody;
import com.ruoyi.shop.domain.dto.ShopMerchantQueryBody;
import com.ruoyi.shop.service.ShopMerchantService;

@RestController
@RequestMapping("/shop/merchants")
public class ShopMerchantController {
    private final ShopMerchantService merchantService;

    public ShopMerchantController(ShopMerchantService merchantService) {
        this.merchantService = merchantService;
    }

    @Anonymous
    @PostMapping("/status")
    public AjaxResult applicationStatus(@Valid @RequestBody ShopMerchantQueryBody body) {
        return AjaxResult.success(merchantService.applicationStatus(body));
    }

    @Anonymous
    @PostMapping("/apply")
    public AjaxResult apply(@Valid @RequestBody ShopMerchantApplyBody body) {
        return AjaxResult.success("商家入驻申请已提交", merchantService.apply(body));
    }
}
