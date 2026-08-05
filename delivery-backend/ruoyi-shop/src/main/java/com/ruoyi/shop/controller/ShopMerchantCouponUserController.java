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
import com.ruoyi.shop.domain.vo.ShopCouponUserOption;
import com.ruoyi.shop.service.ShopCouponService;

@RestController
@RequestMapping("/shop/merchant/coupon-users")
@PreAuthorize("@ss.hasRole('merchant')")
public class ShopMerchantCouponUserController extends BaseController
{
    private final ShopCouponService couponService;

    public ShopMerchantCouponUserController(ShopCouponService couponService)
    {
        this.couponService = couponService;
    }

    @GetMapping
    public TableDataInfo list(@RequestParam(required = false) String keyword,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "50") int pageSize)
    {
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopCouponUserOption> users = couponService.merchantUserOptions(keyword);
        return getDataTable(users);
    }
}
