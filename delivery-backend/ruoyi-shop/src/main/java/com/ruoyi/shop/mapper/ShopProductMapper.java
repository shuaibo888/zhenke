package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopProductCategory;
import com.ruoyi.shop.domain.ShopProductImage;

public interface ShopProductMapper
{
    List<ShopProductCategory> selectCategories(@Param("enabledOnly") boolean enabledOnly);
    ShopProductCategory selectCategoryById(Long categoryId);
    int updateCategory(ShopProductCategory category);

    List<ShopProduct> selectMerchantProducts(@Param("merchantId") Long merchantId,
            @Param("query") ShopProduct query);
    ShopProduct selectMerchantProduct(@Param("merchantId") Long merchantId,
            @Param("productId") Long productId);
    List<ShopProduct> selectAdminProducts(ShopProduct query);
    ShopProduct selectAdminProduct(Long productId);
    ShopProduct selectPublicProduct(Long productId);
    List<ShopProductImage> selectImages(Long productId);
    int insertProduct(ShopProduct product);
    int updateMerchantProduct(ShopProduct product);
    int updateMerchantProductStatus(@Param("merchantId") Long merchantId,
            @Param("productId") Long productId, @Param("status") String status,
            @Param("updateBy") String updateBy);
    int deleteImages(Long productId);
    int insertImage(ShopProductImage image);
}
