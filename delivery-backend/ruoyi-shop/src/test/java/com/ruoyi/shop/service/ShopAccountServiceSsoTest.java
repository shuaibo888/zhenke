package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.Test;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.shop.domain.ShopUser;
import com.ruoyi.shop.mapper.ShopPointMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopUserMapper;
import com.ruoyi.system.service.ISysConfigService;

class ShopAccountServiceSsoTest
{
    private final ShopUserMapper userMapper = mock(ShopUserMapper.class);
    private final ShopAccountService service = new ShopAccountService(
            userMapper,
            mock(ShopPointMapper.class),
            mock(ShopTrialMapper.class),
            mock(TokenService.class),
            mock(RedisCache.class),
            mock(ISysConfigService.class));

    @Test
    void transferRejectsDeletedDisabledOrMissingAccount()
    {
        assertThrows(ServiceException.class, () -> service.loginByVerifiedTransfer(7));
        ShopUser user = new ShopUser();
        user.setStatus("1");
        user.setDelFlag("0");
        when(userMapper.selectById(7L)).thenReturn(user);
        assertThrows(ServiceException.class, () -> service.loginByVerifiedTransfer(7));
        user.setStatus("0");
        user.setDelFlag("2");
        assertThrows(ServiceException.class, () -> service.loginByVerifiedTransfer(7));
    }

    @Test
    void rejectsDisabledPhoneAccountWithRequiredMessage()
    {
        ShopUser user = new ShopUser();
        user.setStatus("1");
        when(userMapper.selectByPhone("13800138000")).thenReturn(user);

        ServiceException exception = assertThrows(ServiceException.class,
                () -> service.loginByVerifiedPhone("13800138000"));

        assertEquals("账号已停用，请重新注册新账号", exception.getMessage());
    }
}
