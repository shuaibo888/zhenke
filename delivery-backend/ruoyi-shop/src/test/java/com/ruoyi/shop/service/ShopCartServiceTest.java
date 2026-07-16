package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.dto.ShopCartItemBody;
import com.ruoyi.shop.mapper.ShopCartMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

class ShopCartServiceTest
{
    private static final long USER_ID = 7L;

    @Test
    void addRejectsQuantityAboveCurrentStock()
    {
        ShopCartMapper mapper = mock(ShopCartMapper.class);
        ShopCartService service = new ShopCartService(mapper);
        ShopProduct product = new ShopProduct();
        product.setProductId(10L);
        product.setStock(1);
        when(mapper.lockEnabledUser(USER_ID)).thenReturn(USER_ID);
        when(mapper.selectOrderableProductForUpdate(10L)).thenReturn(product);
        ShopCartItemBody body = new ShopCartItemBody();
        body.setProductId(10L);
        body.setQuantity(2);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> service.add(body));
        }

        verify(mapper, never()).insert(any());
    }

    private static MockedStatic<SecurityUtils> shopUserLogin()
    {
        LoginUser loginUser = new LoginUser(
                ShopAccountIdentity.toPrincipalId(USER_ID), null, new SysUser(),
                Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class);
        security.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        return security;
    }
}
