package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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
}
