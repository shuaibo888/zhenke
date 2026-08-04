package com.ruoyi.shop.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.service.ShopPointService;

@RestController
@RequestMapping("/shop/users/me/points")
public class ShopPointController extends BaseController
{
    private final ShopPointService pointService;

    public ShopPointController(ShopPointService pointService)
    {
        this.pointService = pointService;
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
}
