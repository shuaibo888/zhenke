package com.ruoyi.shop.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.dto.ShopOrderShipBody;
import com.ruoyi.shop.domain.dto.ShopOrderRefundAuditBody;
import com.ruoyi.shop.domain.dto.ShopOrderRedeemBody;
import com.ruoyi.shop.service.ShopMerchantOrderService;
import com.ruoyi.shop.service.ShopMerchantService;
import com.ruoyi.shop.service.ShopOrderService;
import com.ruoyi.shop.payment.ShopWechatPaymentService;

@RestController
@RequestMapping("/shop/merchant/orders")
@PreAuthorize("@ss.hasRole('merchant')")
public class ShopMerchantOrderController extends BaseController {
    private final ShopMerchantOrderService orderService;
    private final ShopMerchantService merchantService;
    private final ShopWechatPaymentService paymentService;

    public ShopMerchantOrderController(ShopMerchantOrderService orderService, ShopMerchantService merchantService,
                                       ShopWechatPaymentService paymentService) {
        this.orderService = orderService;
        this.merchantService = merchantService;
        this.paymentService = paymentService;
    }

    @GetMapping
    public TableDataInfo list(@RequestParam(required = false) String status,
                              @RequestParam(required = false) String keyword,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize) {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopOrder> rows = orderService.merchantOrders(merchantId, status, keyword);
        return getDataTable(rows);
    }

    @GetMapping("/{orderId}")
    public AjaxResult detail(@PathVariable long orderId) {
        return AjaxResult.success(orderService.merchantOrder(orderId));
    }

    @GetMapping("/{orderId}/logistics")
    public AjaxResult logistics(@PathVariable long orderId) {
        return AjaxResult.success(orderService.merchantOrderLogistics(orderId));
    }

    @Log(title = "商城订单发货", businessType = BusinessType.UPDATE)
    @PutMapping("/{orderId}/ship")
    public AjaxResult ship(@PathVariable long orderId, @Valid @RequestBody ShopOrderShipBody body) {
        return AjaxResult.success(orderService.ship(orderId, body));
    }

    @Log(title = "商城订单退款审核", businessType = BusinessType.UPDATE)
    @PutMapping("/{orderId}/refund/audit")
    public AjaxResult auditRefund(@PathVariable long orderId,
                                  @Valid @RequestBody ShopOrderRefundAuditBody body) {
        ShopOrder order = orderService.auditRefund(orderId, body);
        if (ShopOrderService.REFUNDING.equals(order.getStatus())) {
            paymentService.tryInitiateRefund(orderId);
            order = orderService.merchantOrder(orderId);
        }
        return AjaxResult.success(order);
    }

    @PostMapping("/redeem/preview")
    public AjaxResult previewRedeem(@Valid @RequestBody ShopOrderRedeemBody body) {
        return AjaxResult.success(orderService.previewRedeem(body.getRedeemCode()));
    }

    @Log(title = "线下订单核销", businessType = BusinessType.UPDATE)
    @PostMapping("/redeem")
    public AjaxResult redeem(@Valid @RequestBody ShopOrderRedeemBody body) {
        return AjaxResult.success("线下订单已核销，用户现在可以发布购买甄客验",
                orderService.redeem(body.getRedeemCode()));
    }
}
