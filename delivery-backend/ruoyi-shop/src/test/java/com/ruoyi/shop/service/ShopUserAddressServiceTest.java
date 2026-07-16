package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.shop.domain.ShopUserAddress;
import com.ruoyi.shop.domain.dto.ShopUserAddressBody;
import com.ruoyi.shop.mapper.ShopUserAddressMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

class ShopUserAddressServiceTest
{
    private static final long USER_ID = 7L;

    @Test
    void firstAddressBecomesDefault()
    {
        ShopUserAddressMapper mapper = mock(ShopUserAddressMapper.class);
        ShopUserAddressService service = new ShopUserAddressService(mapper);
        ShopUserAddress stored = address(11L, true);
        when(mapper.lockEnabledUser(USER_ID)).thenReturn(USER_ID);
        when(mapper.countUserAddresses(USER_ID)).thenReturn(0);
        when(mapper.insert(any())).thenAnswer(invocation -> {
            ShopUserAddress inserting = invocation.getArgument(0);
            inserting.setAddressId(11L);
            return 1;
        });
        when(mapper.selectUserAddress(USER_ID, 11L)).thenReturn(stored);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertTrue(service.create(body()).isDefault());
        }

        verify(mapper).clearDefault(USER_ID);
        verify(mapper).insert(any(ShopUserAddress.class));
    }

    @Test
    void updateCannotCrossUserBoundary()
    {
        ShopUserAddressMapper mapper = mock(ShopUserAddressMapper.class);
        ShopUserAddressService service = new ShopUserAddressService(mapper);
        when(mapper.lockEnabledUser(USER_ID)).thenReturn(USER_ID);
        when(mapper.selectUserAddress(USER_ID, 99L)).thenReturn(null);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> service.update(99L, body()));
        }

        verify(mapper, never()).update(any());
    }

    @Test
    void deletingDefaultAddressPromotesRemainingAddress()
    {
        ShopUserAddressMapper mapper = mock(ShopUserAddressMapper.class);
        ShopUserAddressService service = new ShopUserAddressService(mapper);
        when(mapper.lockEnabledUser(USER_ID)).thenReturn(USER_ID);
        when(mapper.selectUserAddress(USER_ID, 11L)).thenReturn(address(11L, true));
        when(mapper.softDelete(USER_ID, 11L)).thenReturn(1);
        when(mapper.selectFirstAddressId(USER_ID)).thenReturn(12L);
        when(mapper.setDefault(USER_ID, 12L)).thenReturn(1);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            service.delete(11L);
        }

        verify(mapper).setDefault(USER_ID, 12L);
    }

    private static MockedStatic<SecurityUtils> shopUserLogin()
    {
        SysUser user = new SysUser();
        LoginUser loginUser = new LoginUser(
                ShopAccountIdentity.toPrincipalId(USER_ID),
                null,
                user,
                Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class);
        security.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        return security;
    }

    private static ShopUserAddressBody body()
    {
        ShopUserAddressBody body = new ShopUserAddressBody();
        body.setRecipient("测试用户");
        body.setPhone("13800000000");
        body.setRegion(List.of("61", "6101", "610113"));
        body.setDetail("测试路18号");
        return body;
    }

    private static ShopUserAddress address(long addressId, boolean isDefault)
    {
        ShopUserAddress address = new ShopUserAddress();
        address.setAddressId(addressId);
        address.setUserId(USER_ID);
        address.setRecipient("测试用户");
        address.setPhone("13800000000");
        address.setProvinceCode("61");
        address.setCityCode("6101");
        address.setDistrictCode("610113");
        address.setDetail("测试路18号");
        address.setIsDefault(isDefault);
        return address;
    }
}
