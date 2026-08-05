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
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopCoupon;
import com.ruoyi.shop.domain.ShopCouponGrant;
import com.ruoyi.shop.domain.dto.ShopCouponBody;
import com.ruoyi.shop.domain.dto.ShopCouponGrantBody;
import com.ruoyi.shop.domain.dto.ShopCouponStatusBody;
import com.ruoyi.shop.service.ShopCouponService;
import com.ruoyi.shop.service.ShopMerchantService;

@RestController
@RequestMapping("/shop/merchant/coupons")
@PreAuthorize("@ss.hasRole('merchant')")
public class ShopMerchantCouponController extends BaseController
{
    private final ShopCouponService couponService;
    private final ShopMerchantService merchantService;

    public ShopMerchantCouponController(ShopCouponService couponService, ShopMerchantService merchantService)
    {
        this.couponService = couponService;
        this.merchantService = merchantService;
    }

    @GetMapping
    public TableDataInfo list(ShopCoupon query,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        return getDataTable(couponService.merchantList(merchantId, query));
    }

    @GetMapping("/{couponId}")
    public AjaxResult detail(@PathVariable long couponId)
    {
        return AjaxResult.success(couponService.merchantDetail(couponId));
    }

    @Log(title = "商家优惠券", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult create(@Valid @RequestBody ShopCouponBody body)
    {
        return AjaxResult.success(couponService.merchantCreate(body, getUsername()));
    }

    @Log(title = "商家优惠券", businessType = BusinessType.UPDATE)
    @PutMapping("/{couponId}")
    public AjaxResult update(@PathVariable long couponId, @Valid @RequestBody ShopCouponBody body)
    {
        return AjaxResult.success(couponService.merchantUpdate(couponId, body, getUsername()));
    }

    @Log(title = "商家优惠券上下架", businessType = BusinessType.UPDATE)
    @PutMapping("/{couponId}/status")
    public AjaxResult updateStatus(@PathVariable long couponId,
            @Valid @RequestBody ShopCouponStatusBody body)
    {
        return AjaxResult.success(couponService.merchantUpdateStatus(couponId, body.getStatus(), getUsername()));
    }

    @Log(title = "商家优惠券定向下发", businessType = BusinessType.INSERT)
    @PostMapping("/{couponId}/grants")
    public AjaxResult grant(@PathVariable long couponId, @Valid @RequestBody ShopCouponGrantBody body)
    {
        return AjaxResult.success(couponService.merchantGrant(couponId, body, getUsername()));
    }

    @GetMapping("/{couponId}/grants")
    public TableDataInfo grants(@PathVariable long couponId,
                                @RequestParam(defaultValue = "1") int pageNum,
                                @RequestParam(defaultValue = "10") int pageSize)
    {
        couponService.merchantDetail(couponId);
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopCouponGrant> grants = couponService.grants(couponId);
        return getDataTable(grants);
    }
}
