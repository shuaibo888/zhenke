package com.ruoyi.shop.domain.vo;

import java.util.List;
import com.ruoyi.shop.domain.ShopUserAddress;

public record ShopUserAddressView(
        Long id,
        String recipient,
        String phone,
        List<String> region,
        String detail,
        boolean isDefault)
{
    public static ShopUserAddressView from(ShopUserAddress address)
    {
        return new ShopUserAddressView(
                address.getAddressId(),
                address.getRecipient(),
                address.getPhone(),
                List.of(address.getProvinceCode(), address.getCityCode(), address.getDistrictCode()),
                address.getDetail(),
                Boolean.TRUE.equals(address.getIsDefault()));
    }
}
