package com.ruoyi.shop.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.service.ShopAdminOrderService;

@RestController
@RequestMapping("/shop/admin/orders")
@PreAuthorize("@ss.hasRole('admin')")
public class ShopOrderAdminController extends BaseController
{
    private final ShopAdminOrderService orderService;

    public ShopOrderAdminController(ShopAdminOrderService orderService)
    {
        this.orderService = orderService;
    }

    @GetMapping
    public TableDataInfo list()
    {
        startPage();
        List<ShopOrder> rows = orderService.adminOrders();
        return getDataTable(rows);
    }

    @GetMapping("/{orderId}")
    public AjaxResult detail(@PathVariable long orderId)
    {
        return AjaxResult.success(orderService.adminOrder(orderId));
    }
}
