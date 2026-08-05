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
import com.ruoyi.shop.domain.dto.ShopProductCategoryBody;
import com.ruoyi.shop.domain.dto.ShopProductBody;
import com.ruoyi.shop.domain.dto.ShopProductStatusBody;
import com.ruoyi.shop.service.ShopProductImageResourceService;
import com.ruoyi.shop.service.ShopProductService;
import com.ruoyi.framework.config.ServerConfig;

@RestController
@RequestMapping("/shop/admin/products")
@PreAuthorize("@ss.hasRole('admin')")
public class ShopProductAdminController extends BaseController
{
    private final ShopProductService productService;
    private final ShopProductImageResourceService imageResourceService;
    private final ServerConfig serverConfig;

    public ShopProductAdminController(ShopProductService productService,
            ShopProductImageResourceService imageResourceService, ServerConfig serverConfig)
    {
        this.productService = productService;
        this.imageResourceService = imageResourceService;
        this.serverConfig = serverConfig;
    }

    @PreAuthorize("@ss.hasRole('admin')")
    @GetMapping
    public TableDataInfo list(ShopProduct query,
                              @RequestParam(defaultValue = "1") int pageNum,
                              @RequestParam(defaultValue = "10") int pageSize)
    {
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(pageSize, 50)));
        List<ShopProduct> products = productService.adminProducts(query);
        return getDataTable(products);
    }

    @PreAuthorize("@ss.hasRole('admin')")
    @GetMapping("/{productId}")
    public AjaxResult detail(@PathVariable long productId)
    {
        return AjaxResult.success(productService.adminProduct(productId));
    }

    @PreAuthorize("@ss.hasRole('admin')")
    @PostMapping("/{productId}/images")
    public AjaxResult uploadImage(@PathVariable long productId,
                                  @RequestParam("file") MultipartFile file,
                                  @RequestParam("kind") String kind)
    {
        ShopProduct product = productService.adminProduct(productId);
        String fileName = imageResourceService.upload(file, kind, product.getMerchantId());
        AjaxResult result = AjaxResult.success("商品图片上传成功");
        result.put("url", serverConfig.getUrl() + fileName);
        return result;
    }

    @Log(title = "平台管理商品", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasRole('admin')")
    @PutMapping("/{productId}")
    public AjaxResult update(@PathVariable long productId, @Valid @RequestBody ShopProductBody body)
    {
        return AjaxResult.success(productService.adminUpdate(productId, body, getUsername()));
    }

    @Log(title = "平台管理商品上下架", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasRole('admin')")
    @PutMapping("/{productId}/status")
    public AjaxResult updateStatus(@PathVariable long productId,
                                   @Valid @RequestBody ShopProductStatusBody body)
    {
        return AjaxResult.success(productService.adminUpdateStatus(productId, body.getStatus(), getUsername()));
    }

    @PreAuthorize("@ss.hasRole('admin')")
    @GetMapping("/categories/all")
    public AjaxResult categories()
    {
        return AjaxResult.success(productService.allCategories());
    }

    @Log(title = "商品分类", businessType = BusinessType.UPDATE)
    @PreAuthorize("@ss.hasRole('admin')")
    @PutMapping("/categories/{categoryId}")
    public AjaxResult updateCategory(@PathVariable long categoryId,
            @Valid @RequestBody ShopProductCategoryBody body)
    {
        return toAjax(productService.updateCategory(categoryId, body, getUsername()));
    }
}
