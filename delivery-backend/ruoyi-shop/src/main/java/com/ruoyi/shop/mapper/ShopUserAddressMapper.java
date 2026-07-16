package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopUserAddress;

public interface ShopUserAddressMapper
{
    Long lockEnabledUser(Long userId);
    List<ShopUserAddress> selectUserAddresses(Long userId);
    ShopUserAddress selectUserAddress(@Param("userId") Long userId, @Param("addressId") Long addressId);
    int countUserAddresses(Long userId);
    int insert(ShopUserAddress address);
    int update(ShopUserAddress address);
    int clearDefault(Long userId);
    int setDefault(@Param("userId") Long userId, @Param("addressId") Long addressId);
    int softDelete(@Param("userId") Long userId, @Param("addressId") Long addressId);
    Long selectFirstAddressId(Long userId);
}
