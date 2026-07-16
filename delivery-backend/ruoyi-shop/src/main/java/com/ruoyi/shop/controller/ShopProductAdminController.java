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
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.dto.ShopProductCategoryBody;
import com.ruoyi.shop.service.ShopProductService;

@RestController
@RequestMapping("/shop/admin/products")
public class ShopProductAdminController extends BaseController
{
    private final ShopProductService productService;

    public ShopProductAdminController(ShopProductService productService)
    {
        this.productService = productService;
    }

    @PreAuthorize("@ss.hasPermi('shop:product:list')")
    @GetMapping
    public TableDataInfo list(ShopProduct query)
    {
        startPage();
        List<ShopProduct> products = productService.adminProducts(query);
        return getDataTable(products);
    }

    @PreAuthorize("@ss.hasPermi('shop:product:query')")
    @GetMapping("/{productId}")
    public AjaxResult detail(@PathVariable long productId)
    {
        return AjaxResult.success(productService.adminProduct(productId));
    }

    @PreAuthorize("@ss.hasPermi('shop:product:query')")
    @GetMapping("/categories/all")
    public AjaxResult categories()
    {
        return AjaxResult.success(productService.allCategories());
    }

    @Log(title = "商品分类", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:category:edit')")
    @PutMapping("/categories/{categoryId}")
    public AjaxResult updateCategory(@PathVariable long categoryId,
            @Valid @RequestBody ShopProductCategoryBody body)
    {
        return toAjax(productService.updateCategory(categoryId, body, getUsername()));
    }
}
