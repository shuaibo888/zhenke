package com.ruoyi.shop.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
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

@Service
public class ShopProductService
{
    public static final String DRAFT = "DRAFT";
    public static final String ON_SALE = "ON_SALE";
    public static final String OFF_SALE = "OFF_SALE";
    private static final String MAIN_IMAGE = "MAIN";
    private static final String DETAIL_IMAGE = "DETAIL";
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

    public int updateCategory(long categoryId, ShopProductCategoryBody body, String operator)
    {
        ShopProductCategory existing = productMapper.selectCategoryById(categoryId);
        if (existing == null || !isFixedCategory(existing.getCategoryCode()))
        {
            throw new ServiceException("商品分类不存在");
        }
        ShopProductCategory category = new ShopProductCategory();
        category.setCategoryId(categoryId);
        category.setCategoryName(StringUtils.trim(body.getCategoryName()));
        category.setCategorySort(body.getCategorySort());
        category.setStatus(body.getStatus());
        category.setUpdateBy(operator);
        return productMapper.updateCategory(category);
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
        requireCreateImages(body);
        ShopProduct product = fromBody(body);
        product.setMerchantId(merchant.getMerchantId());
        product.setStatus(DRAFT);
        product.setDelFlag("0");
        product.setCreateBy(operator);
        product.setUpdateBy(operator);
        productMapper.insertProduct(product);
        replaceImages(product.getProductId(), body.getMainImageUrls(), body.getDetailImageUrls());
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
        boolean criticalChange = hasCertificationCriticalChange(existing, body);
        ShopProduct product = fromBody(body);
        product.setProductId(productId);
        product.setMerchantId(merchantId);
        product.setUpdateBy(operator);
        if (productMapper.updateMerchantProduct(product) == 0)
        {
            throw new ServiceException("商品不存在");
        }
        replaceImages(productId, body.getMainImageUrls(), body.getDetailImageUrls());
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
            if (product.getStock() == null || product.getStock() <= 0)
            {
                throw new ServiceException("库存大于0时才能上架商品");
            }
            requireEnabledCategory(product.getCategoryId());
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

    private ShopProduct fromBody(ShopProductBody body)
    {
        ShopProduct product = new ShopProduct();
        product.setCategoryId(body.getCategoryId());
        product.setBrandName(StringUtils.trim(body.getBrandName()));
        product.setProductName(StringUtils.trim(body.getProductName()));
        product.setSubtitle(StringUtils.trim(body.getSubtitle()));
        product.setDetail("");
        product.setCoverUrl(normalizeProductImageUrl(body.getCoverUrl()));
        product.setPrice(body.getPrice());
        product.setStock(body.getStock());
        return product;
    }

    private List<String> normalizedImageUrls(List<String> imageUrls)
    {
        Set<String> unique = new LinkedHashSet<>();
        if (imageUrls != null)
        {
            for (String imageUrl : imageUrls)
            {
                String value = normalizeProductImageUrl(imageUrl);
                if (StringUtils.isNotEmpty(value))
                {
                    unique.add(value);
                }
            }
        }
        return new ArrayList<>(unique);
    }

    private String normalizeProductImageUrl(String imageUrl)
    {
        String value = StringUtils.trim(imageUrl);
        if (StringUtils.isEmpty(value))
        {
            return value;
        }
        int productPathIndex = value.indexOf(PRODUCT_IMAGE_PATH_PREFIX);
        return productPathIndex >= 0 ? value.substring(productPathIndex) : value;
    }

    private void requireCreateImages(ShopProductBody body)
    {
        if (normalizedImageUrls(body.getMainImageUrls()).isEmpty())
        {
            throw new ServiceException("请至少上传1张商品主图");
        }
        if (normalizedImageUrls(body.getDetailImageUrls()).isEmpty())
        {
            throw new ServiceException("请至少上传1张商品详情图");
        }
    }

    private boolean hasCertificationCriticalChange(ShopProduct existing, ShopProductBody body)
    {
        return !Objects.equals(existing.getCategoryId(), body.getCategoryId())
                || !Objects.equals(StringUtils.trim(existing.getBrandName()), StringUtils.trim(body.getBrandName()))
                || !Objects.equals(StringUtils.trim(existing.getProductName()), StringUtils.trim(body.getProductName()))
                || !Objects.equals(normalizeProductImageUrl(existing.getCoverUrl()),
                        normalizeProductImageUrl(body.getCoverUrl()))
                || !Objects.equals(normalizedImageUrls(existing.getMainImageUrls()), normalizedImageUrls(body.getMainImageUrls()))
                || !Objects.equals(normalizedImageUrls(existing.getDetailImageUrls()), normalizedImageUrls(body.getDetailImageUrls()));
    }

    private void replaceImages(Long productId, List<String> mainImageUrls, List<String> detailImageUrls)
    {
        productMapper.deleteImages(productId);
        int sort = 1;
        for (String imageUrl : normalizedImageUrls(mainImageUrls))
        {
            ShopProductImage image = new ShopProductImage();
            image.setProductId(productId);
            image.setImageType(MAIN_IMAGE);
            image.setImageUrl(imageUrl);
            image.setImageSort(sort++);
            productMapper.insertImage(image);
        }
        sort = 1;
        for (String imageUrl : normalizedImageUrls(detailImageUrls))
        {
            ShopProductImage image = new ShopProductImage();
            image.setProductId(productId);
            image.setImageType(DETAIL_IMAGE);
            image.setImageUrl(imageUrl);
            image.setImageSort(sort++);
            productMapper.insertImage(image);
        }
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
        if (category == null || !"0".equals(category.getStatus()) || !isFixedCategory(category.getCategoryCode()))
        {
            throw new ServiceException("商品分类不存在或已停用");
        }
        return category;
    }

    private boolean isFixedCategory(String categoryCode)
    {
        return categoryCode != null && categoryCode.matches("CATEGORY_[1-4]");
    }
}
