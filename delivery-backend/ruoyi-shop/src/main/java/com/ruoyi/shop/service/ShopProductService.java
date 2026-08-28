package com.ruoyi.shop.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopProductCategory;
import com.ruoyi.shop.domain.ShopProductImage;
import com.ruoyi.shop.domain.dto.ShopProductBody;
import com.ruoyi.shop.domain.dto.ShopProductCategoryBody;
import com.ruoyi.shop.mapper.ShopProductMapper;
import com.ruoyi.shop.util.ShopPlatformMediaPathUtils;

@Service
public class ShopProductService
{
    public static final String DRAFT = "DRAFT";
    public static final String ON_SALE = "ON_SALE";
    public static final String OFF_SALE = "OFF_SALE";
    public static final String FULFILLMENT_ONLINE = "ONLINE";
    public static final String FULFILLMENT_OFFLINE = "OFFLINE";
    private static final String MAIN_IMAGE = "MAIN";
    private static final String DETAIL_IMAGE = "DETAIL";
    public static final Set<String> LOCAL_LIFE_CATEGORY_CODES = Set.of("ZHENKE_HOTEL", "ZHENKE_RESTAURANT", "ZHENKE_SCENIC");
    private static final String PRODUCT_IMAGE_PATH_PREFIX = "/profile/upload/product/";

    private final ShopProductMapper productMapper;
    private final ShopMerchantService merchantService;
    private final ShopProductCertificationService certificationService;

    public ShopProductService(ShopProductMapper productMapper, ShopMerchantService merchantService,
            ShopProductCertificationService certificationService)
    {
        this.productMapper = productMapper;
        this.merchantService = merchantService;
        this.certificationService = certificationService;
    }

    public List<ShopProductCategory> enabledCategories()
    {
        return productMapper.selectCategories(true);
    }

    public List<ShopProductCategory> allCategories()
    {
        return productMapper.selectCategories(false);
    }

    @Transactional
    public ShopProductCategory createCategory(ShopProductCategoryBody body, String operator)
    {
        String categoryName = normalizedCategoryName(body.getCategoryName());
        requireUniqueCategoryName(categoryName, null);
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryCode(newCategoryCode());
        category.setCategoryName(categoryName);
        category.setCategorySort(body.getCategorySort());
        category.setStatus(body.getStatus());
        category.setCreateBy(operator);
        category.setUpdateBy(operator);
        productMapper.insertCategory(category);
        return productMapper.selectCategoryById(category.getCategoryId());
    }

    @Transactional
    public int updateCategory(long categoryId, ShopProductCategoryBody body, String operator)
    {
        ShopProductCategory existing = productMapper.selectCategoryById(categoryId);
        if (existing == null)
        {
            throw new ServiceException("商品分类不存在");
        }
        String categoryName = normalizedCategoryName(body.getCategoryName());
        requireUniqueCategoryName(categoryName, categoryId);
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(categoryId);
        category.setCategoryName(categoryName);
        category.setCategorySort(body.getCategorySort());
        category.setStatus(body.getStatus());
        category.setUpdateBy(operator);
        return productMapper.updateCategory(category);
    }

    @Transactional
    public int deleteCategory(long categoryId)
    {
        ShopProductCategory category = productMapper.selectCategoryById(categoryId);
        if (category == null)
        {
            throw new ServiceException("商品分类不存在");
        }
        if (category.getCategoryCode() != null
                && LOCAL_LIFE_CATEGORY_CODES.contains(category.getCategoryCode()))
        {
            throw new ServiceException("甄客酒店、饭店和景区是平台稳定分类，只能调整名称、排序或启停");
        }
        if (productMapper.countProductsByCategoryId(categoryId) > 0)
        {
            throw new ServiceException("该分类已关联商品，请先调整商品分类后再删除");
        }
        return productMapper.deleteCategory(categoryId);
    }

    public List<ShopProduct> merchantProducts(long merchantId, ShopProduct query)
    {
        return productMapper.selectMerchantProducts(merchantId, query);
    }

    public ShopProduct merchantProduct(long productId)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        ShopProduct product = productMapper.selectMerchantProduct(merchant.getMerchantId(), productId);
        return requireVisibleProduct(product);
    }

    public List<ShopProduct> adminProducts(ShopProduct query)
    {
        return productMapper.selectAdminProducts(query);
    }

    public ShopProduct adminProduct(long productId)
    {
        return requireVisibleProduct(productMapper.selectAdminProduct(productId));
    }

    public List<ShopProduct> publicProducts(ShopProduct query)
    {
        String keyword = StringUtils.trim(query.getKeyword());
        if (StringUtils.isNotEmpty(keyword) && keyword.length() > 50)
        {
            throw new ServiceException("搜索关键词不能超过50个字符");
        }
        query.setKeyword(StringUtils.isEmpty(keyword) ? null : keyword);
        return productMapper.selectPublicProducts(query);
    }

    public ShopProduct publicProduct(long productId)
    {
        return requireVisibleProduct(productMapper.selectPublicProduct(productId));
    }

    @Transactional
    public ShopProduct create(ShopProductBody body, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        requireEnabledCategory(body.getCategoryId());
        long merchantId = merchant.getMerchantId();
        ProductMedia media = normalizeProductMedia(body, merchantId, Set.of());
        requireCreateImages(media);
        ShopProduct product = fromBody(body, media.coverUrl());
        product.setMerchantId(merchant.getMerchantId());
        product.setStatus(DRAFT);
        product.setDelFlag("0");
        product.setCreateBy(operator);
        product.setUpdateBy(operator);
        productMapper.insertProduct(product);
        replaceImages(product.getProductId(), media.mainImageUrls(), media.detailImageUrls());
        return merchantProduct(product.getProductId());
    }

    @Transactional
    public ShopProduct update(long productId, ShopProductBody body, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return updateForMerchant(merchant.getMerchantId(), productId, body, operator, false);
    }

    @Transactional
    public ShopProduct adminUpdate(long productId, ShopProductBody body, String operator)
    {
        ShopProduct existing = adminProduct(productId);
        return updateForMerchant(existing.getMerchantId(), productId, body, operator, true);
    }

    private ShopProduct updateForMerchant(long merchantId, long productId, ShopProductBody body,
            String operator, boolean adminResult)
    {
        ShopProduct existing = requireVisibleProduct(productMapper.selectMerchantProduct(merchantId, productId));
        requireEnabledCategory(body.getCategoryId());
        Set<String> legacyMedia = legacyMediaValues(existing);
        ProductMedia media = normalizeProductMedia(body, merchantId, legacyMedia);
        boolean criticalChange = hasCertificationCriticalChange(
                existing, body, media, merchantId, legacyMedia);
        ShopProduct product = fromBody(body, media.coverUrl());
        product.setProductId(productId);
        product.setMerchantId(merchantId);
        product.setUpdateBy(operator);
        if (productMapper.updateMerchantProduct(product) == 0)
        {
            throw new ServiceException("商品不存在");
        }
        replaceImages(productId, media.mainImageUrls(), media.detailImageUrls());
        if (criticalChange)
        {
            certificationService.invalidateForCriticalProductChange(merchantId, productId, operator);
        }
        return adminResult ? adminProduct(productId)
                : requireVisibleProduct(productMapper.selectMerchantProduct(merchantId, productId));
    }

    @Transactional
    public ShopProduct updateStatus(long productId, String status, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return updateStatusForMerchant(merchant.getMerchantId(), productId, status, operator, false);
    }

    @Transactional
    public ShopProduct adminUpdateStatus(long productId, String status, String operator)
    {
        ShopProduct existing = adminProduct(productId);
        return updateStatusForMerchant(existing.getMerchantId(), productId, status, operator, true);
    }

    private ShopProduct updateStatusForMerchant(long merchantId, long productId, String status,
            String operator, boolean adminResult)
    {
        ShopProduct product = requireVisibleProduct(
                productMapper.selectMerchantProduct(merchantId, productId));
        if (ON_SALE.equals(status))
        {
            if (!"1".equals(product.getStockUnlimited())
                    && (product.getStock() == null || product.getStock() <= 0))
            {
                throw new ServiceException("库存大于0时才能上架商品");
            }
            requireEnabledCategory(product.getCategoryId());
            if (LOCAL_LIFE_CATEGORY_CODES.contains(product.getCategoryCode()))
            {
                validateLocalLifePackage(product);
                if (!"1".equals(product.getSupportsOffline()))
                {
                    throw new ServiceException("甄客酒店、饭店和景区商品只支持线下核销");
                }
            }
        }
        if (!ON_SALE.equals(status) && !OFF_SALE.equals(status))
        {
            throw new ServiceException("商品状态无效");
        }
        if (productMapper.updateMerchantProductStatus(merchantId, productId, status, operator) == 0)
        {
            throw new ServiceException("商品不存在");
        }
        return adminResult ? adminProduct(productId)
                : requireVisibleProduct(productMapper.selectMerchantProduct(merchantId, productId));
    }

    private ShopProduct fromBody(ShopProductBody body, String coverUrl)
    {
        ShopProduct product = new ShopProduct();
        product.setCategoryId(body.getCategoryId());
        product.setBrandName(StringUtils.trim(body.getBrandName()));
        product.setProductName(StringUtils.trim(body.getProductName()));
        product.setSubtitle(StringUtils.trim(body.getSubtitle()));
        product.setDetail("");
        product.setPackageContent(StringUtils.trim(body.getPackageContent()));
        product.setUsageNotice(StringUtils.trim(body.getUsageNotice()));
        product.setValidityDescription(StringUtils.trim(body.getValidityDescription()));
        product.setReservationRequired(Boolean.TRUE.equals(body.getReservationRequired()) ? "1" : "0");
        product.setReservationNotice(StringUtils.trim(body.getReservationNotice()));
        product.setRefundExpiryRule(StringUtils.trim(body.getRefundExpiryRule()));
        product.setCoverUrl(coverUrl);
        product.setPrice(body.getPrice());
        boolean stockUnlimited = Boolean.TRUE.equals(body.getStockUnlimited());
        if (!stockUnlimited && body.getStock() == null)
        {
            throw new ServiceException("有限库存商品必须填写库存");
        }
        product.setStockUnlimited(stockUnlimited ? "1" : "0");
        product.setStock(stockUnlimited ? 0 : body.getStock());
        applyFulfillment(product, body);
        ShopProductCategory category = productMapper.selectCategoryById(body.getCategoryId());
        if (category != null && LOCAL_LIFE_CATEGORY_CODES.contains(category.getCategoryCode()))
        {
            validateLocalLifePackage(product);
            product.setSupportsOnline("0");
            product.setSupportsOffline("1");
        }
        return product;
    }

    private void validateLocalLifePackage(ShopProduct product)
    {
        if (StringUtils.isEmpty(product.getPackageContent())
                || StringUtils.isEmpty(product.getUsageNotice())
                || StringUtils.isEmpty(product.getValidityDescription())
                || StringUtils.isEmpty(product.getRefundExpiryRule()))
        {
            throw new ServiceException("本地生活套餐需完整填写套餐内容、使用须知、有效期和退款/过期规则");
        }
        if ("1".equals(product.getReservationRequired())
                && StringUtils.isEmpty(product.getReservationNotice()))
        {
            throw new ServiceException("需要预约的本地生活套餐必须填写预约说明");
        }
    }

    private void applyFulfillment(ShopProduct product, ShopProductBody body)
    {
        boolean online = Boolean.TRUE.equals(body.getSupportsOnline());
        boolean offline = Boolean.TRUE.equals(body.getSupportsOffline());
        if (body.getSupportsOnline() == null && body.getSupportsOffline() == null)
        {
            // 兼容未升级的前端：默认仅线上
            online = true;
            offline = false;
        }
        if (!online && !offline)
        {
            throw new ServiceException("请至少选择一种销售方式（线上配送或到店核销）");
        }
        product.setSupportsOnline(online ? "1" : "0");
        product.setSupportsOffline(offline ? "1" : "0");
    }

    private ProductMedia normalizeProductMedia(
            ShopProductBody body, long merchantId, Set<String> legacyMedia)
    {
        return new ProductMedia(
                normalizeProductImageUrl(body.getCoverUrl(), merchantId, legacyMedia),
                normalizedImageUrls(body.getMainImageUrls(), merchantId, legacyMedia),
                normalizedImageUrls(body.getDetailImageUrls(), merchantId, legacyMedia));
    }

    private List<String> normalizedImageUrls(
            List<String> imageUrls, long merchantId, Set<String> legacyMedia)
    {
        Set<String> unique = new LinkedHashSet<>();
        if (imageUrls != null)
        {
            for (String imageUrl : imageUrls)
            {
                String value = normalizeProductImageUrl(imageUrl, merchantId, legacyMedia);
                if (StringUtils.isNotEmpty(value))
                {
                    unique.add(value);
                }
            }
        }
        return new ArrayList<>(unique);
    }

    private String normalizeProductImageUrl(
            String imageUrl, long merchantId, Set<String> legacyMedia)
    {
        String submittedValue = StringUtils.trim(imageUrl);
        if (StringUtils.isEmpty(submittedValue))
        {
            return submittedValue;
        }
        try
        {
            String normalized = ShopPlatformMediaPathUtils.normalize(submittedValue);
            String ownerPrefix = PRODUCT_IMAGE_PATH_PREFIX + "merchant-" + merchantId + "/";
            String lowerValue = normalized.toLowerCase(Locale.ROOT);
            if (normalized.startsWith(ownerPrefix)
                    && (lowerValue.endsWith(".jpg")
                            || lowerValue.endsWith(".jpeg")
                            || lowerValue.endsWith(".png")))
            {
                ShopPlatformMediaPathUtils.requireStoredImage(normalized);
                return normalized;
            }
        }
        catch (ServiceException exception)
        {
            // Exact legacy values may remain unchanged while an existing product is edited.
        }
        if (legacyMedia.contains(submittedValue))
        {
            return submittedValue;
        }
        throw new ServiceException("商品图片必须通过当前商家账号上传");
    }

    private void requireCreateImages(ProductMedia media)
    {
        if (StringUtils.isEmpty(media.coverUrl()))
        {
            throw new ServiceException("请上传商品封面图");
        }
        if (media.mainImageUrls().isEmpty())
        {
            throw new ServiceException("请至少上传1张商品主图");
        }
        if (media.detailImageUrls().isEmpty())
        {
            throw new ServiceException("请至少上传1张商品详情图");
        }
    }

    private boolean hasCertificationCriticalChange(
            ShopProduct existing, ShopProductBody body, ProductMedia submittedMedia,
            long merchantId, Set<String> legacyMedia)
    {
        return !Objects.equals(existing.getCategoryId(), body.getCategoryId())
                || !Objects.equals(StringUtils.trim(existing.getBrandName()), StringUtils.trim(body.getBrandName()))
                || !Objects.equals(StringUtils.trim(existing.getProductName()), StringUtils.trim(body.getProductName()))
                || !Objects.equals(
                        normalizeProductImageUrl(existing.getCoverUrl(), merchantId, legacyMedia),
                        submittedMedia.coverUrl())
                || !Objects.equals(
                        normalizedImageUrls(existing.getMainImageUrls(), merchantId, legacyMedia),
                        submittedMedia.mainImageUrls())
                || !Objects.equals(
                        normalizedImageUrls(existing.getDetailImageUrls(), merchantId, legacyMedia),
                        submittedMedia.detailImageUrls());
    }

    private void replaceImages(Long productId, List<String> mainImageUrls, List<String> detailImageUrls)
    {
        productMapper.deleteImages(productId);
        int sort = 1;
        for (String imageUrl : mainImageUrls)
        {
            ShopProductImage image = new ShopProductImage();
            image.setProductId(productId);
            image.setImageType(MAIN_IMAGE);
            image.setImageUrl(imageUrl);
            image.setImageSort(sort++);
            productMapper.insertImage(image);
        }
        sort = 1;
        for (String imageUrl : detailImageUrls)
        {
            ShopProductImage image = new ShopProductImage();
            image.setProductId(productId);
            image.setImageType(DETAIL_IMAGE);
            image.setImageUrl(imageUrl);
            image.setImageSort(sort++);
            productMapper.insertImage(image);
        }
    }

    private Set<String> legacyMediaValues(ShopProduct product)
    {
        Set<String> values = new LinkedHashSet<>();
        addLegacyMediaValue(values, product.getCoverUrl());
        if (product.getMainImageUrls() != null)
        {
            product.getMainImageUrls().forEach(value -> addLegacyMediaValue(values, value));
        }
        if (product.getDetailImageUrls() != null)
        {
            product.getDetailImageUrls().forEach(value -> addLegacyMediaValue(values, value));
        }
        return values;
    }

    private void addLegacyMediaValue(Set<String> values, String value)
    {
        String normalized = StringUtils.trim(value);
        if (StringUtils.isNotEmpty(normalized))
        {
            values.add(normalized);
        }
    }

    private record ProductMedia(
            String coverUrl, List<String> mainImageUrls, List<String> detailImageUrls)
    {
    }

    private ShopProduct requireVisibleProduct(ShopProduct product)
    {
        if (product == null)
        {
            throw new ServiceException("商品不存在");
        }
        return withImages(product);
    }

    private ShopProduct withImages(ShopProduct product)
    {
        if (product != null)
        {
            List<ShopProductImage> images = productMapper.selectImages(product.getProductId());
            product.setImages(images);
            Set<String> mainImages = new LinkedHashSet<>();
            Set<String> detailImages = new LinkedHashSet<>();
            for (ShopProductImage image : images)
            {
                String imageUrl = StringUtils.trim(image.getImageUrl());
                if (StringUtils.isEmpty(imageUrl))
                {
                    continue;
                }
                if (DETAIL_IMAGE.equals(image.getImageType()))
                {
                    detailImages.add(imageUrl);
                }
                else if (!imageUrl.equals(StringUtils.trim(product.getCoverUrl())))
                {
                    mainImages.add(imageUrl);
                }
            }
            product.setMainImageUrls(new ArrayList<>(mainImages));
            product.setDetailImageUrls(new ArrayList<>(detailImages));
        }
        return product;
    }

    private ShopProductCategory requireEnabledCategory(Long categoryId)
    {
        ShopProductCategory category = productMapper.selectCategoryById(categoryId);
        if (category == null || !"0".equals(category.getStatus()))
        {
            throw new ServiceException("商品分类不存在或已停用");
        }
        return category;
    }

    private String normalizedCategoryName(String categoryName)
    {
        return StringUtils.trim(categoryName);
    }

    private void requireUniqueCategoryName(String categoryName, Long excludeCategoryId)
    {
        if (productMapper.selectCategoryByName(categoryName, excludeCategoryId) != null)
        {
            throw new ServiceException("商品分类名称已存在");
        }
    }

    private String newCategoryCode()
    {
        return "CATEGORY_" + UUID.randomUUID().toString().replace("-", "").substring(0, 23);
    }
}
