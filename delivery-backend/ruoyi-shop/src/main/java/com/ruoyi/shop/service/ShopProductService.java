package com.ruoyi.shop.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
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

    private final ShopProductMapper productMapper;
    private final ShopMerchantService merchantService;

    public ShopProductService(ShopProductMapper productMapper, ShopMerchantService merchantService)
    {
        this.productMapper = productMapper;
        this.merchantService = merchantService;
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

    public ShopProduct publicProduct(long productId)
    {
        return requireVisibleProduct(productMapper.selectPublicProduct(productId));
    }

    @Transactional
    public ShopProduct create(ShopProductBody body, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        requireEnabledCategory(body.getCategoryId());
        ShopProduct product = fromBody(body);
        product.setMerchantId(merchant.getMerchantId());
        product.setStatus(DRAFT);
        product.setDelFlag("0");
        product.setCreateBy(operator);
        product.setUpdateBy(operator);
        productMapper.insertProduct(product);
        replaceImages(product.getProductId(), normalizedImageUrls(body));
        return merchantProduct(product.getProductId());
    }

    @Transactional
    public ShopProduct update(long productId, ShopProductBody body, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        requireVisibleProduct(productMapper.selectMerchantProduct(merchant.getMerchantId(), productId));
        requireEnabledCategory(body.getCategoryId());
        ShopProduct product = fromBody(body);
        product.setProductId(productId);
        product.setMerchantId(merchant.getMerchantId());
        product.setUpdateBy(operator);
        if (productMapper.updateMerchantProduct(product) == 0)
        {
            throw new ServiceException("商品不存在");
        }
        replaceImages(productId, normalizedImageUrls(body));
        return merchantProduct(productId);
    }

    @Transactional
    public ShopProduct updateStatus(long productId, String status, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        ShopProduct product = requireVisibleProduct(
                productMapper.selectMerchantProduct(merchant.getMerchantId(), productId));
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
        if (productMapper.updateMerchantProductStatus(merchant.getMerchantId(), productId, status, operator) == 0)
        {
            throw new ServiceException("商品不存在");
        }
        return merchantProduct(productId);
    }

    private ShopProduct fromBody(ShopProductBody body)
    {
        ShopProduct product = new ShopProduct();
        product.setCategoryId(body.getCategoryId());
        product.setProductName(StringUtils.trim(body.getProductName()));
        product.setSubtitle(StringUtils.trim(body.getSubtitle()));
        product.setDetail(StringUtils.trim(body.getDetail()));
        product.setCoverUrl(StringUtils.trim(body.getCoverUrl()));
        product.setPrice(body.getPrice());
        product.setStock(body.getStock());
        return product;
    }

    private List<String> normalizedImageUrls(ShopProductBody body)
    {
        Set<String> unique = new LinkedHashSet<>();
        unique.add(StringUtils.trim(body.getCoverUrl()));
        if (body.getImageUrls() != null)
        {
            for (String imageUrl : body.getImageUrls())
            {
                String value = StringUtils.trim(imageUrl);
                if (StringUtils.isNotEmpty(value))
                {
                    unique.add(value);
                }
            }
        }
        return new ArrayList<>(unique);
    }

    private void replaceImages(Long productId, List<String> imageUrls)
    {
        productMapper.deleteImages(productId);
        int sort = 1;
        for (String imageUrl : imageUrls)
        {
            ShopProductImage image = new ShopProductImage();
            image.setProductId(productId);
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
            product.setImages(productMapper.selectImages(product.getProductId()));
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
