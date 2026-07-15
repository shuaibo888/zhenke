package com.ruoyi.shop.security;

import java.util.Set;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;

public final class ShopAccountIdentity
{
    public static final String SHOP_USER_PERMISSION = "shop:user";
    private static final long SHOP_USER_ID_OFFSET = 1_000_000_000_000L;

    private ShopAccountIdentity() { }

    public static long toPrincipalId(long shopUserId)
    {
        return SHOP_USER_ID_OFFSET + shopUserId;
    }

    public static long requireShopUserId()
    {
        LoginUser loginUser = SecurityUtils.getLoginUser();
        Set<String> permissions = loginUser.getPermissions();
        Long principalId = loginUser.getUserId();
        if (principalId == null || principalId <= SHOP_USER_ID_OFFSET || permissions == null
                || !permissions.contains(SHOP_USER_PERMISSION))
        {
            throw new ServiceException("当前登录账号不是商城用户", HttpStatus.FORBIDDEN);
        }
        return principalId - SHOP_USER_ID_OFFSET;
    }
}
