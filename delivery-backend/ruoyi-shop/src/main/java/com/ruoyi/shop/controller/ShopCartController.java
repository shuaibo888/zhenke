package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopCartItemBody;
import com.ruoyi.shop.domain.dto.ShopCartQuantityBody;
import com.ruoyi.shop.service.ShopCartService;

@RestController
@RequestMapping("/shop/users/me/cart")
public class ShopCartController
{
    private final ShopCartService cartService;

    public ShopCartController(ShopCartService cartService)
    {
        this.cartService = cartService;
    }

    @GetMapping
    public AjaxResult list()
    {
        return AjaxResult.success(cartService.myCart());
    }

    @PostMapping
    public AjaxResult add(@Valid @RequestBody ShopCartItemBody body)
    {
        return AjaxResult.success(cartService.add(body));
    }

    @PutMapping("/{cartItemId}")
    public AjaxResult update(@PathVariable long cartItemId, @Valid @RequestBody ShopCartQuantityBody body)
    {
        return AjaxResult.success(cartService.updateQuantity(cartItemId, body.getQuantity()));
    }

    @DeleteMapping("/{cartItemId}")
    public AjaxResult delete(@PathVariable long cartItemId)
    {
        cartService.delete(cartItemId);
        return AjaxResult.success("购物车商品已移除");
    }
}
