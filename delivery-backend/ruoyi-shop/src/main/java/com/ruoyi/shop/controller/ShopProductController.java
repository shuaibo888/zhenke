package com.ruoyi.shop.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.service.ShopProductService;

@Anonymous
@RestController
@RequestMapping("/shop/products")
public class ShopProductController
{
    private final ShopProductService productService;

    public ShopProductController(ShopProductService productService)
    {
        this.productService = productService;
    }

    @GetMapping("/categories")
    public AjaxResult categories()
    {
        return AjaxResult.success(productService.enabledCategories());
    }

    @GetMapping("/{productId}")
    public AjaxResult detail(@PathVariable long productId)
    {
        return AjaxResult.success(productService.publicProduct(productId));
    }
}
