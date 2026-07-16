package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopCartItem;
import com.ruoyi.shop.domain.ShopProduct;

public interface ShopCartMapper
{
    Long lockEnabledUser(Long userId);
    List<ShopCartItem> selectUserItems(Long userId);
    ShopCartItem selectUserItem(@Param("userId") Long userId, @Param("cartItemId") Long cartItemId);
    ShopCartItem selectUserProduct(@Param("userId") Long userId, @Param("productId") Long productId);
    ShopProduct selectOrderableProductForUpdate(Long productId);
    int insert(ShopCartItem item);
    int updateQuantity(@Param("userId") Long userId, @Param("cartItemId") Long cartItemId,
            @Param("quantity") Integer quantity);
    int delete(@Param("userId") Long userId, @Param("cartItemId") Long cartItemId);
    int deleteUserProducts(@Param("userId") Long userId, @Param("productIds") List<Long> productIds);
}
