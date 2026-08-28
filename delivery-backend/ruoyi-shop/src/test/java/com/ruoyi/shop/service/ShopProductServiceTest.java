package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import com.ruoyi.common.config.RuoYiConfig;
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
    @TempDir
    Path tempDirectory;

    private String previousProfile;
    private final ShopProductMapper productMapper = mock(ShopProductMapper.class);
    private final ShopMerchantService merchantService = mock(ShopMerchantService.class);
    private final ShopProductCertificationService certificationService = mock(ShopProductCertificationService.class);
    private final ShopProductService productService = new ShopProductService(
            productMapper, merchantService, certificationService);

    @BeforeEach
    void setUpStoredImages() throws Exception
    {
        previousProfile = RuoYiConfig.getProfile();
        new RuoYiConfig().setProfile(tempDirectory.toString());
        for (String fileName : List.of(
                "cover.jpg", "main.jpg", "detail.jpg", "c.jpg", "m.jpg", "d.jpg"))
        {
            writeImage("upload/product/merchant-1/" + fileName);
        }
    }

    @AfterEach
    void restoreProfile()
    {
        new RuoYiConfig().setProfile(previousProfile);
    }

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
        body.setStockUnlimited(true);
        body.setCoverUrl("http://127.0.0.1:8080/api/profile/upload/product/merchant-1/cover.jpg");
        body.setMainImageUrls(List.of(
                "https://dzshop.vip/profile/upload/product/merchant-1/main.jpg"));
        body.setDetailImageUrls(List.of(
                "/profile/upload/product/merchant-1/detail.jpg"));

        productService.create(body, "merchant");

        assertEquals("/profile/upload/product/merchant-1/cover.jpg",
                insertedProduct.get().getCoverUrl());
        assertEquals("1", insertedProduct.get().getStockUnlimited());
        assertEquals(0, insertedProduct.get().getStock());
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

    @Test
    void refusesToDeleteStableLocalLifeCategory()
    {
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(1L);
        category.setCategoryCode("ZHENKE_HOTEL");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);

        assertThrows(ServiceException.class, () -> productService.deleteCategory(1L));

        verify(productMapper, never()).countProductsByCategoryId(1L);
        verify(productMapper, never()).deleteCategory(1L);
    }

    @Test
    void refusesToPublishIncompleteExistingLocalLifePackage()
    {
        ShopMerchant merchant = new ShopMerchant();
        merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);

        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(1L);
        category.setCategoryCode("ZHENKE_HOTEL");
        category.setStatus("0");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);

        ShopProduct product = new ShopProduct();
        product.setProductId(10L);
        product.setMerchantId(1L);
        product.setCategoryId(1L);
        product.setCategoryCode("ZHENKE_HOTEL");
        product.setStock(10);
        product.setSupportsOffline("1");
        when(productMapper.selectMerchantProduct(1L, 10L)).thenReturn(product);

        assertThrows(ServiceException.class, () -> productService.updateStatus(10L, "ON_SALE", "merchant"));

        verify(productMapper, never()).updateMerchantProductStatus(1L, 10L, "ON_SALE", "merchant");
    }

    @Test
    void unlimitedStockProductCanBePublishedWithZeroPhysicalStock()
    {
        ShopMerchant merchant = new ShopMerchant();
        merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(1L);
        category.setCategoryCode("CATEGORY_1");
        category.setStatus("0");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);
        ShopProduct product = new ShopProduct();
        product.setProductId(10L);
        product.setMerchantId(1L);
        product.setCategoryId(1L);
        product.setCategoryCode("CATEGORY_1");
        product.setStock(0);
        product.setStockUnlimited("1");
        when(productMapper.selectMerchantProduct(1L, 10L)).thenReturn(product);
        when(productMapper.updateMerchantProductStatus(1L, 10L, "ON_SALE", "merchant"))
                .thenReturn(1);
        when(productMapper.selectImages(10L)).thenReturn(List.of());

        assertEquals(10L, productService.updateStatus(10L, "ON_SALE", "merchant").getProductId());
        verify(productMapper).updateMerchantProductStatus(1L, 10L, "ON_SALE", "merchant");
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

    private void writeImage(String relativePath) throws Exception
    {
        Path file = tempDirectory.resolve(relativePath);
        Files.createDirectories(file.getParent());
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "jpg", file.toFile());
    }

    @Test
    void localLifeCategoryForcesOfflineAndRequiresPackageRules()
    {
        ShopMerchant merchant = new ShopMerchant(); merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);
        ShopProductCategory category = new ShopProductCategory(); category.setCategoryId(1L); category.setCategoryCode("ZHENKE_HOTEL"); category.setStatus("0");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);
        ShopProductBody body = validBody(); body.setCoverUrl("/profile/upload/product/merchant-1/c.jpg"); body.setMainImageUrls(List.of("/profile/upload/product/merchant-1/m.jpg")); body.setDetailImageUrls(List.of("/profile/upload/product/merchant-1/d.jpg")); body.setSupportsOnline(true); body.setSupportsOffline(false);
        assertThrows(ServiceException.class, () -> productService.create(body, "merchant"));
        body.setPackageContent("双人住宿套餐"); body.setUsageNotice("到店出示核销码"); body.setValidityDescription("购买后30日内"); body.setRefundExpiryRule("未核销可退款，过期自动退");
        body.setReservationRequired(true);
        assertThrows(ServiceException.class, () -> productService.create(body, "merchant"));
        body.setReservationNotice("至少提前一天联系商家预约");
        when(productMapper.insertProduct(any())).thenAnswer(i -> { ShopProduct p=i.getArgument(0); p.setProductId(99L); return 1; });
        when(productMapper.selectMerchantProduct(1L,99L)).thenAnswer(i -> { ShopProduct p=new ShopProduct(); p.setProductId(99L); p.setSupportsOnline("0"); p.setSupportsOffline("1"); return p; });
        when(productMapper.selectImages(99L)).thenReturn(List.of());
        ShopProduct created=productService.create(body,"merchant"); assertEquals("0",created.getSupportsOnline()); assertEquals("1",created.getSupportsOffline());
    }

    @Test
    void ordinaryMallCategoryPreservesExistingOnlineAndOfflineCapabilities()
    {
        ShopMerchant merchant = new ShopMerchant();
        merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);

        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(2L);
        category.setCategoryCode("GENERAL_GOODS");
        category.setStatus("0");
        when(productMapper.selectCategoryById(2L)).thenReturn(category);

        AtomicReference<ShopProduct> insertedProduct = new AtomicReference<>();
        when(productMapper.insertProduct(any(ShopProduct.class))).thenAnswer(invocation -> {
            ShopProduct product = invocation.getArgument(0);
            product.setProductId(100L);
            insertedProduct.set(product);
            return 1;
        });
        when(productMapper.selectMerchantProduct(1L, 100L)).thenAnswer(ignored -> insertedProduct.get());
        when(productMapper.selectImages(100L)).thenReturn(List.of());

        ShopProductBody body = validBody();
        body.setCategoryId(2L);
        body.setCoverUrl("/profile/upload/product/merchant-1/cover.jpg");
        body.setMainImageUrls(List.of("/profile/upload/product/merchant-1/main.jpg"));
        body.setDetailImageUrls(List.of("/profile/upload/product/merchant-1/detail.jpg"));
        body.setSupportsOnline(true);
        body.setSupportsOffline(true);

        ShopProduct created = productService.create(body, "merchant");

        assertEquals("1", created.getSupportsOnline());
        assertEquals("1", created.getSupportsOffline());
    }

    @Test
    void rejectsExternalOrAnotherMerchantsProductMediaOnCreate()
    {
        ShopMerchant merchant = new ShopMerchant();
        merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(1L);
        category.setCategoryCode("CATEGORY_1");
        category.setStatus("0");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);

        ShopProductBody body = validBody();
        body.setCoverUrl("https://cdn.example.com/cover.jpg");
        body.setMainImageUrls(List.of("/profile/upload/product/merchant-1/main.jpg"));
        body.setDetailImageUrls(List.of("/profile/upload/product/merchant-1/detail.jpg"));
        assertThrows(ServiceException.class, () -> productService.create(body, "merchant"));

        body.setCoverUrl("/profile/upload/product/merchant-1/cover.jpg");
        body.setMainImageUrls(List.of("/profile/upload/product/merchant-2/main.jpg"));
        assertThrows(ServiceException.class, () -> productService.create(body, "merchant"));

        verify(productMapper, never()).insertProduct(any());
    }

    @Test
    void existingLegacyProductMediaCanRemainUnchangedDuringAnEdit()
    {
        ShopMerchant merchant = new ShopMerchant();
        merchant.setMerchantId(1L);
        when(merchantService.currentMerchantAccount()).thenReturn(merchant);
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(1L);
        category.setCategoryCode("CATEGORY_1");
        category.setStatus("0");
        when(productMapper.selectCategoryById(1L)).thenReturn(category);

        ShopProduct existing = new ShopProduct();
        existing.setProductId(10L);
        existing.setMerchantId(1L);
        existing.setCategoryId(1L);
        existing.setBrandName("Brand");
        existing.setProductName("Product");
        existing.setCoverUrl("https://legacy.example.com/cover.jpg");
        when(productMapper.selectMerchantProduct(1L, 10L)).thenReturn(existing);
        ShopProductImage main = new ShopProductImage();
        main.setImageType("MAIN");
        main.setImageUrl("https://legacy.example.com/main.jpg");
        ShopProductImage detail = new ShopProductImage();
        detail.setImageType("DETAIL");
        detail.setImageUrl("https://legacy.example.com/detail.jpg");
        when(productMapper.selectImages(10L)).thenReturn(List.of(main, detail));
        when(productMapper.updateMerchantProduct(any(ShopProduct.class))).thenReturn(1);

        ShopProductBody body = validBody();
        body.setCoverUrl(existing.getCoverUrl());
        body.setMainImageUrls(List.of(main.getImageUrl()));
        body.setDetailImageUrls(List.of(detail.getImageUrl()));

        productService.update(10L, body, "merchant");

        var captor = org.mockito.ArgumentCaptor.forClass(ShopProduct.class);
        verify(productMapper).updateMerchantProduct(captor.capture());
        assertEquals("https://legacy.example.com/cover.jpg", captor.getValue().getCoverUrl());
        verify(certificationService, never())
                .invalidateForCriticalProductChange(anyLong(), anyLong(), anyString());
    }

}
