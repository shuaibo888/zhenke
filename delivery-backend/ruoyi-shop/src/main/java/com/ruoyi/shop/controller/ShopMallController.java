package com.ruoyi.shop.controller;

import java.util.List;
import com.github.pagehelper.PageHelper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.service.ShopProductService;

@Anonymous
@RestController
@RequestMapping("/shop/mall")
public class ShopMallController extends BaseController
{
    private final ShopProductService productService;

    public ShopMallController(ShopProductService productService)
    {
        this.productService = productService;
    }

    @GetMapping("/products")
    public TableDataInfo products(@RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "12") int pageSize)
    {
        String normalizedKeyword = keyword == null ? null : keyword.trim();
        if (normalizedKeyword != null && normalizedKeyword.length() > 50)
        {
            throw new ServiceException("搜索关键词不能超过50个字符");
        }
        ShopProduct query = new ShopProduct();
        query.setCategoryId(categoryId);
        query.setKeyword(normalizedKeyword);
        int safePageNum = Math.max(1, pageNum);
        int safePageSize = Math.max(1, Math.min(pageSize, 24));
        PageHelper.startPage(safePageNum, safePageSize, safePageNum == 1);
        List<ShopProduct> products = productService.publicProducts(query);
        return getDataTable(products);
    }
}
