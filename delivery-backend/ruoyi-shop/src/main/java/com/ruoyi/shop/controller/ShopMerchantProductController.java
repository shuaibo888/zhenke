package com.ruoyi.shop.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.dto.ShopProductBody;
import com.ruoyi.shop.domain.dto.ShopProductStatusBody;
import com.ruoyi.shop.service.ShopMerchantService;
import com.ruoyi.shop.service.ShopProductService;
import com.ruoyi.shop.service.ShopProductImageResourceService;

@RestController
@RequestMapping("/shop/merchant/products")
public class ShopMerchantProductController extends BaseController {
    private final ShopProductService productService;
    private final ShopMerchantService merchantService;
    private final ShopProductImageResourceService imageResourceService;

    public ShopMerchantProductController(ShopProductService productService, ShopMerchantService merchantService,
            ShopProductImageResourceService imageResourceService) {
        this.productService = productService;
        this.merchantService = merchantService;
        this.imageResourceService = imageResourceService;
    }

    @PreAuthorize("@ss.hasPermi('shop:product:list')")
    @GetMapping
    public TableDataInfo list(ShopProduct query,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize) {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopProduct> products = productService.merchantProducts(merchantId, query);
        return getDataTable(products);
    }

    @PreAuthorize("@ss.hasPermi('shop:product:query')")
    @GetMapping("/{productId}")
    public AjaxResult detail(@PathVariable long productId) {
        return AjaxResult.success(productService.merchantProduct(productId));
    }

    @Log(title = "商家商品", businessType = BusinessType.INSERT)
    @PreAuthorize("@ss.hasPermi('shop:product:add')")
    @PostMapping
    public AjaxResult create(@Valid @RequestBody ShopProductBody body) {
        return AjaxResult.success("商品已保存为草稿", productService.create(body, getUsername()));
    }

    @PreAuthorize("@ss.hasAnyPermi('shop:product:add,shop:product:edit')")
    @PostMapping("/images")
    public AjaxResult uploadImage(@RequestParam("file") MultipartFile file,
                                  @RequestParam("kind") String kind) {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        String fileName = imageResourceService.upload(file, kind, merchantId);
        AjaxResult result = AjaxResult.success("商品图片上传成功");
        result.put("url", fileName);
        return result;
    }

    @Log(title = "商家商品", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:product:edit')")
    @PutMapping("/{productId}")
    public AjaxResult update(@PathVariable long productId, @Valid @RequestBody ShopProductBody body) {
        return AjaxResult.success(productService.update(productId, body, getUsername()));
    }

    @Log(title = "商品上下架", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasPermi('shop:product:status')")
    @PutMapping("/{productId}/status")
    public AjaxResult updateStatus(@PathVariable long productId,
                                   @Valid @RequestBody ShopProductStatusBody body) {
        return AjaxResult.success(productService.updateStatus(productId, body.getStatus(), getUsername()));
    }
}
