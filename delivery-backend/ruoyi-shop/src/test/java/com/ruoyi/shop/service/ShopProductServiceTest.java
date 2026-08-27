package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopProductCategory;
import com.ruoyi.shop.domain.ShopProductImage;
import com.ruoyi.shop.domain.dto.ShopProductBody;
import com.ruoyi.shop.domain.dto.ShopProductCategoryBody;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.mapper.ShopProductMapper;

class ShopProductServiceTest
{
    private final ShopProductMapper productMapper = mock(ShopProductMapper.class);
    private final ShopMerchantService merchantService = mock(ShopMerchantService.class);
    private final ShopProductCertificationService certificationService = mock(ShopProductCertificationService.class);
    private final ShopProductService productService = new ShopProductService(
            productMapper, merchantService, certificationService);

    @Test
    void storesUploadedProductImagesAsRootRelativePaths()
    {
        ShopMerchant merchant = new ShopMerchant();
        merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);

        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(1L);
        category.setCategoryCode("CATEGORY_1");
        category.setStatus("0");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);

        AtomicReference<ShopProduct> insertedProduct = new AtomicReference<>();
        when(productMapper.insertProduct(any(ShopProduct.class))).thenAnswer(invocation -> {
            ShopProduct product = invocation.getArgument(0);
            product.setProductId(10L);
            insertedProduct.set(product);
            return 1;
        });

        List<ShopProductImage> insertedImages = new ArrayList<>();
        when(productMapper.insertImage(any(ShopProductImage.class))).thenAnswer(invocation -> {
            insertedImages.add(invocation.getArgument(0));
            return 1;
        });
        when(productMapper.selectMerchantProduct(1L, 10L)).thenAnswer(ignored -> insertedProduct.get());
        when(productMapper.selectImages(10L)).thenReturn(insertedImages);

        ShopProductBody body = validBody();
        body.setCoverUrl("http://dzshop.vip/profile/upload/product/merchant-1/cover.jpg");
        body.setMainImageUrls(List.of(
                "https://dzshop.vip/profile/upload/product/merchant-1/main.jpg"));
        body.setDetailImageUrls(List.of(
                "/profile/upload/product/merchant-1/detail.jpg"));

        productService.create(body, "merchant");

        assertEquals("/profile/upload/product/merchant-1/cover.jpg",
                insertedProduct.get().getCoverUrl());
        assertEquals(List.of(
                "/profile/upload/product/merchant-1/main.jpg",
                "/profile/upload/product/merchant-1/detail.jpg"),
                insertedImages.stream().map(ShopProductImage::getImageUrl).toList());
    }

    @Test
    void createsDynamicCategoryWithStableGeneratedCode()
    {
        AtomicReference<ShopProductCategory> insertedCategory = new AtomicReference<>();
        when(productMapper.insertCategory(any(ShopProductCategory.class))).thenAnswer(invocation -> {
            ShopProductCategory category = invocation.getArgument(0);
            category.setCategoryId(5L);
            insertedCategory.set(category);
            return 1;
        });
        when(productMapper.selectCategoryById(5L)).thenAnswer(ignored -> insertedCategory.get());

        ShopProductCategoryBody body = categoryBody("  新分类  ");
        ShopProductCategory created = productService.createCategory(body, "admin");

        assertEquals("新分类", created.getCategoryName());
        assertEquals(32, created.getCategoryCode().length());
        assertTrue(created.getCategoryCode().matches("CATEGORY_[0-9a-f]{23}"));
    }

    @Test
    void refusesToDeleteCategoryReferencedByProducts()
    {
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(1L);
        when(productMapper.selectCategoryById(1L)).thenReturn(category);
        when(productMapper.countProductsByCategoryId(1L)).thenReturn(1);

        assertThrows(ServiceException.class, () -> productService.deleteCategory(1L));
        verify(productMapper, never()).deleteCategory(1L);
    }

    private ShopProductBody validBody()
    {
        ShopProductBody body = new ShopProductBody();
        body.setCategoryId(1L);
        body.setBrandName("Brand");
        body.setProductName("Product");
        body.setSubtitle("Subtitle");
        body.setPrice(new BigDecimal("99.00"));
        body.setStock(10);
        return body;
    }

    private ShopProductCategoryBody categoryBody(String categoryName)
    {
        ShopProductCategoryBody body = new ShopProductCategoryBody();
        body.setCategoryName(categoryName);
        body.setCategorySort(5);
        body.setStatus("0");
        return body;
    }
    @Test
    void localLifeCategoryForcesOfflineAndRequiresPackageRules()
    {
        ShopMerchant merchant = new ShopMerchant(); merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);
        ShopProductCategory category = new ShopProductCategory(); category.setCategoryId(1L); category.setCategoryCode("ZHENKE_HOTEL"); category.setStatus("0");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);
        ShopProductBody body = validBody(); body.setCoverUrl("/profile/upload/product/c.jpg"); body.setMainImageUrls(List.of("/profile/upload/product/m.jpg")); body.setDetailImageUrls(List.of("/profile/upload/product/d.jpg")); body.setSupportsOnline(true); body.setSupportsOffline(false);
        assertThrows(ServiceException.class, () -> productService.create(body, "merchant"));
        body.setPackageContent("双人住宿套餐"); body.setUsageNotice("到店出示核销码"); body.setValidityDescription("购买后30日内"); body.setRefundExpiryRule("未核销可退款，过期自动退");
        when(productMapper.insertProduct(any())).thenAnswer(i -> { ShopProduct p=i.getArgument(0); p.setProductId(99L); return 1; });
        when(productMapper.selectMerchantProduct(1L,99L)).thenAnswer(i -> { ShopProduct p=new ShopProduct(); p.setProductId(99L); p.setSupportsOnline("0"); p.setSupportsOffline("1"); return p; });
        when(productMapper.selectImages(99L)).thenReturn(List.of());
        ShopProduct created=productService.create(body,"merchant"); assertEquals("0",created.getSupportsOnline()); assertEquals("1",created.getSupportsOffline());
    }

}
