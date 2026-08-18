package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.dto.ShopPointTransferBody;
import com.ruoyi.shop.service.ShopPointService;
import com.ruoyi.shop.service.ShopCouponService;
import com.ruoyi.shop.service.ShopPointTransferService;

@RestController
@RequestMapping("/shop/users/me/points")
public class ShopPointController extends BaseController
{
    private final ShopPointService pointService;
    private final ShopCouponService couponService;
    private final ShopPointTransferService transferService;

    public ShopPointController(ShopPointService pointService, ShopCouponService couponService,
            ShopPointTransferService transferService)
    {
        this.pointService = pointService;
        this.couponService = couponService;
        this.transferService = transferService;
    }

    @GetMapping
    public AjaxResult summary()
    {
        return AjaxResult.success(pointService.mySummary());
    }

    @GetMapping("/records")
    public TableDataInfo records(@RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize)
    {
        return getDataTable(pointService.myRecords(pageNum, pageSize));
    }

    @GetMapping("/coupons")
    public AjaxResult exchangeableCoupons()
    {
        return AjaxResult.success(couponService.exchangeableCoupons());
    }

    @PostMapping("/coupons/{couponId}/exchange")
    public AjaxResult exchangeCoupon(@PathVariable long couponId)
    {
        couponService.exchangeWithPoints(couponId);
        return AjaxResult.success("优惠券兑换成功");
    }

    @GetMapping("/transfer-sources")
    public AjaxResult transferSources()
    {
        return AjaxResult.success(transferService.listSources());
    }

    @GetMapping("/transfer-sources/{sourceSystem}/balance")
    public AjaxResult transferBalance(@PathVariable String sourceSystem)
    {
        return AjaxResult.success(transferService.queryBalance(sourceSystem));
    }

    @PostMapping("/transfers")
    public AjaxResult transfer(@Valid @RequestBody ShopPointTransferBody body)
    {
        return AjaxResult.success("积分划拨成功",
                transferService.transfer(body.getSourceSystem(), body.getPoints()));
    }
}
