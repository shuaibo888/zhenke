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
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.dto.ShopOrderShipBody;
import com.ruoyi.shop.domain.dto.ShopOrderRefundAuditBody;
import com.ruoyi.shop.service.ShopMerchantOrderService;
import com.ruoyi.shop.service.ShopMerchantService;

@RestController
@RequestMapping("/shop/merchant/orders")
@PreAuthorize("@ss.hasRole('merchant')")
public class ShopMerchantOrderController extends BaseController
{
    private final ShopMerchantOrderService orderService;
    private final ShopMerchantService merchantService;

    public ShopMerchantOrderController(ShopMerchantOrderService orderService, ShopMerchantService merchantService)
    {
        this.orderService = orderService;
        this.merchantService = merchantService;
    }

    @GetMapping
    public TableDataInfo list()
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        startPage();
        List<ShopOrder> rows = orderService.merchantOrders(merchantId);
        return getDataTable(rows);
    }

    @GetMapping("/{orderId}")
    public AjaxResult detail(@PathVariable long orderId)
    {
        return AjaxResult.success(orderService.merchantOrder(orderId));
    }

    @Log(title = "商城订单发货", businessType = BusinessType.UPDATE)
    @PutMapping("/{orderId}/ship")
    public AjaxResult ship(@PathVariable long orderId, @Valid @RequestBody ShopOrderShipBody body)
    {
        return AjaxResult.success(orderService.ship(orderId, body));
    }

    @Log(title = "商城订单退款审核", businessType = BusinessType.UPDATE)
    @PutMapping("/{orderId}/refund/audit")
    public AjaxResult auditRefund(@PathVariable long orderId,
            @Valid @RequestBody ShopOrderRefundAuditBody body)
    {
        return AjaxResult.success(orderService.auditRefund(orderId, body));
    }
}
