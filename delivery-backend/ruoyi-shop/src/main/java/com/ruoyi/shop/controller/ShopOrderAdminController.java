package com.ruoyi.shop.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.enums.BusinessType;
import org.springframework.web.bind.annotation.RestController;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.dto.ShopOrderRefundAuditBody;
import com.ruoyi.shop.domain.dto.ShopOrderShipBody;
import com.ruoyi.shop.domain.dto.ShopOrderRedeemBody;
import org.springframework.web.bind.annotation.PostMapping;
import com.ruoyi.shop.service.ShopAdminOrderService;
import com.ruoyi.shop.service.ShopMerchantOrderService;
import com.ruoyi.shop.service.ShopOrderService;
import com.ruoyi.shop.payment.ShopWechatPaymentService;

@RestController
@RequestMapping("/shop/admin/orders")
@PreAuthorize("@ss.hasRole('admin')")
public class ShopOrderAdminController extends BaseController
{
    private final ShopAdminOrderService orderService;
    private final ShopMerchantOrderService merchantOrderService;
    private final ShopWechatPaymentService paymentService;

    public ShopOrderAdminController(ShopAdminOrderService orderService,
            ShopMerchantOrderService merchantOrderService, ShopWechatPaymentService paymentService)
    {
        this.orderService = orderService;
        this.merchantOrderService = merchantOrderService;
        this.paymentService = paymentService;
    }

    @GetMapping
    public TableDataInfo list(@RequestParam(required = false) String status,
                              @RequestParam(required = false) String keyword,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize)
    {
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopOrder> rows = orderService.adminOrders(status, keyword);
        return getDataTable(rows);
    }

    @GetMapping("/{orderId}")
    public AjaxResult detail(@PathVariable long orderId)
    {
        return AjaxResult.success(orderService.adminOrder(orderId));
    }

    @GetMapping("/{orderId}/logistics")
    public AjaxResult logistics(@PathVariable long orderId)
    {
        return AjaxResult.success(merchantOrderService.adminOrderLogistics(orderId));
    }

    @Log(title = "平台管理商城订单发货", businessType = BusinessType.UPDATE)
    @PutMapping("/{orderId}/ship")
    public AjaxResult ship(@PathVariable long orderId, @Valid @RequestBody ShopOrderShipBody body)
    {
        return AjaxResult.success(merchantOrderService.adminShip(orderId, body));
    }

    @Log(title = "平台管理商城订单退款审核", businessType = BusinessType.UPDATE)
    @PutMapping("/{orderId}/refund/audit")
    public AjaxResult auditRefund(@PathVariable long orderId,
                                  @Valid @RequestBody ShopOrderRefundAuditBody body)
    {
        ShopOrder order = merchantOrderService.adminAuditRefund(orderId, body);
        if (ShopOrderService.REFUNDING.equals(order.getStatus()))
        {
            paymentService.tryInitiateRefund(orderId);
            order = orderService.adminOrder(orderId);
        }
        return AjaxResult.success(order);
    }

    @PostMapping("/redeem/preview")
    public AjaxResult previewRedeem(@Valid @RequestBody ShopOrderRedeemBody body)
    {
        return AjaxResult.success(merchantOrderService.adminPreviewRedeem(body.getRedeemCode()));
    }

    @Log(title = "平台管理线下订单核销", businessType = BusinessType.UPDATE)
    @PostMapping("/redeem")
    public AjaxResult redeem(@Valid @RequestBody ShopOrderRedeemBody body)
    {
        return AjaxResult.success("线下订单已核销，用户现在可以发布购买甄客验",
                merchantOrderService.adminRedeem(body.getRedeemCode()));
    }
}
