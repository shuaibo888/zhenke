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
import com.ruoyi.shop.service.ShopOrderService;

@RestController
@RequestMapping("/shop/orders")
public class ShopOrderController
{
    private final ShopOrderService orderService;

    public ShopOrderController(ShopOrderService orderService)
    {
        this.orderService = orderService;
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
        return AjaxResult.success(orderService.cancel(orderId));
    }

    @PutMapping("/{orderId}/pay")
    public AjaxResult pay(@PathVariable long orderId)
    {
        return AjaxResult.success(orderService.pay(orderId));
    }

    @PutMapping("/{orderId}/received")
    public AjaxResult received(@PathVariable long orderId)
    {
        return AjaxResult.success(orderService.confirmReceived(orderId));
    }
}
