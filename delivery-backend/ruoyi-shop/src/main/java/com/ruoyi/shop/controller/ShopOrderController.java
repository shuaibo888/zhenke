package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopCartCheckoutBody;
import com.ruoyi.shop.domain.dto.ShopOrderCreateBody;
import com.ruoyi.shop.domain.dto.ShopOrderRefundBody;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.payment.ShopWechatPaymentService;
import com.ruoyi.shop.service.ShopOrderService;

@RestController
@RequestMapping("/shop/orders")
public class ShopOrderController
{
    private final ShopOrderService orderService;
    private final ShopWechatPaymentService paymentService;

    public ShopOrderController(ShopOrderService orderService, ShopWechatPaymentService paymentService)
    {
        this.orderService = orderService;
        this.paymentService = paymentService;
    }

    @GetMapping
    public AjaxResult list()
    {
        return AjaxResult.success(orderService.myOrders());
    }

    @GetMapping("/{orderId}")
    public AjaxResult detail(@PathVariable long orderId)
    {
        return AjaxResult.success(orderService.myOrder(orderId));
    }

    @PostMapping
    public AjaxResult create(@Valid @RequestBody ShopOrderCreateBody body)
    {
        return AjaxResult.success(orderService.create(body));
    }

    @PostMapping("/from-cart")
    public AjaxResult createFromCart(@Valid @RequestBody ShopCartCheckoutBody body)
    {
        return AjaxResult.success(orderService.createFromCart(body.getAddressId()));
    }

    @PutMapping("/{orderId}/cancel")
    public AjaxResult cancel(@PathVariable long orderId)
    {
        return AjaxResult.success(paymentService.cancelUserOrder(orderId));
    }

    @PutMapping("/{orderId}/received")
    public AjaxResult received(@PathVariable long orderId)
    {
        return AjaxResult.success(orderService.confirmReceived(orderId));
    }

    @PostMapping("/{orderId}/refund")
    public AjaxResult refund(@PathVariable long orderId, @Valid @RequestBody ShopOrderRefundBody body)
    {
        ShopOrder order = orderService.requestRefund(orderId, body);
        if (ShopOrderService.REFUNDING.equals(order.getStatus()))
        {
            paymentService.tryInitiateRefund(orderId);
            order = orderService.myOrder(orderId);
        }
        return AjaxResult.success(order);
    }
}
