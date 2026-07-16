package com.ruoyi.shop.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopCartItem;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.dto.ShopCartItemBody;
import com.ruoyi.shop.mapper.ShopCartMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopCartService
{
    private static final int MAX_ITEM_QUANTITY = 99;

    private final ShopCartMapper cartMapper;

    public ShopCartService(ShopCartMapper cartMapper)
    {
        this.cartMapper = cartMapper;
    }

    public List<ShopCartItem> myCart()
    {
        return cartMapper.selectUserItems(ShopAccountIdentity.requireShopUserId());
    }

    @Transactional
    public ShopCartItem add(ShopCartItemBody body)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        ShopProduct product = requireOrderableProduct(body.getProductId());
        ShopCartItem existing = cartMapper.selectUserProduct(userId, body.getProductId());
        int quantity = body.getQuantity() + (existing == null ? 0 : existing.getQuantity());
        requireAvailableStock(product, quantity);
        if (quantity > MAX_ITEM_QUANTITY)
        {
            throw new ServiceException("单个商品最多购买99件");
        }
        if (existing == null)
        {
            ShopCartItem item = new ShopCartItem();
            item.setUserId(userId);
            item.setProductId(body.getProductId());
            item.setQuantity(quantity);
            if (cartMapper.insert(item) == 0)
            {
                throw new ServiceException("加入购物车失败");
            }
            return requireItem(userId, item.getCartItemId());
        }
        requireUpdated(cartMapper.updateQuantity(userId, existing.getCartItemId(), quantity));
        return requireItem(userId, existing.getCartItemId());
    }

    @Transactional
    public ShopCartItem updateQuantity(long cartItemId, int quantity)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        ShopCartItem item = requireItem(userId, cartItemId);
        ShopProduct product = requireOrderableProduct(item.getProductId());
        requireAvailableStock(product, quantity);
        requireUpdated(cartMapper.updateQuantity(userId, cartItemId, quantity));
        return requireItem(userId, cartItemId);
    }

    @Transactional
    public void delete(long cartItemId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        if (cartMapper.delete(userId, cartItemId) == 0)
        {
            throw new ServiceException("购物车商品不存在");
        }
    }

    private void lockUser(long userId)
    {
        if (cartMapper.lockEnabledUser(userId) == null)
        {
            throw new ServiceException("商城用户不存在或已停用");
        }
    }

    private ShopProduct requireOrderableProduct(long productId)
    {
        ShopProduct product = cartMapper.selectOrderableProductForUpdate(productId);
        if (product == null)
        {
            throw new ServiceException("商品不存在或已下架");
        }
        return product;
    }

    private void requireAvailableStock(ShopProduct product, int quantity)
    {
        if (product.getStock() == null || product.getStock() < quantity)
        {
            throw new ServiceException("商品库存不足");
        }
    }

    private ShopCartItem requireItem(long userId, long cartItemId)
    {
        ShopCartItem item = cartMapper.selectUserItem(userId, cartItemId);
        if (item == null)
        {
            throw new ServiceException("购物车商品不存在");
        }
        return item;
    }

    private void requireUpdated(int rows)
    {
        if (rows == 0)
        {
            throw new ServiceException("购物车更新失败");
        }
    }
}
