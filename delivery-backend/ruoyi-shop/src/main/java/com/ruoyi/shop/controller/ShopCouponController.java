package com.ruoyi.shop.controller;

import java.math.BigDecimal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.service.ShopCouponService;

@RestController
@RequestMapping("/shop/coupons")
public class ShopCouponController
{
    private final ShopCouponService couponService;

    public ShopCouponController(ShopCouponService couponService)
    {
        this.couponService = couponService;
    }

    @GetMapping
    public AjaxResult list()
    {
        return AjaxResult.success(couponService.myCoupons());
    }

    @GetMapping("/{userCouponId}")
    public AjaxResult detail(@PathVariable long userCouponId)
    {
        return AjaxResult.success(couponService.myCoupon(userCouponId));
    }

    @GetMapping("/available")
    public AjaxResult available(@RequestParam long merchantId, @RequestParam BigDecimal subtotal)
    {
        return AjaxResult.success(couponService.availableCoupons(merchantId, subtotal));
    }
}
