package com.ruoyi.shop.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopUserAddress;
import com.ruoyi.shop.domain.dto.ShopUserAddressBody;
import com.ruoyi.shop.domain.vo.ShopUserAddressView;
import com.ruoyi.shop.mapper.ShopUserAddressMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopUserAddressService
{
    static final int MAX_ADDRESSES_PER_USER = 20;

    private final ShopUserAddressMapper addressMapper;

    public ShopUserAddressService(ShopUserAddressMapper addressMapper)
    {
        this.addressMapper = addressMapper;
    }

    public List<ShopUserAddressView> myAddresses()
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        return addressMapper.selectUserAddresses(userId).stream().map(ShopUserAddressView::from).toList();
    }

    @Transactional
    public ShopUserAddressView create(ShopUserAddressBody body)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        int addressCount = addressMapper.countUserAddresses(userId);
        if (addressCount >= MAX_ADDRESSES_PER_USER)
        {
            throw new ServiceException("最多保存20个收货地址");
        }

        boolean makeDefault = addressCount == 0 || Boolean.TRUE.equals(body.getIsDefault());
        if (makeDefault)
        {
            addressMapper.clearDefault(userId);
        }
        ShopUserAddress address = fromBody(userId, null, body);
        address.setIsDefault(makeDefault);
        if (addressMapper.insert(address) == 0)
        {
            throw new ServiceException("收货地址新增失败");
        }
        return ShopUserAddressView.from(requireAddress(userId, address.getAddressId()));
    }

    @Transactional
    public ShopUserAddressView update(long addressId, ShopUserAddressBody body)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        requireAddress(userId, addressId);

        ShopUserAddress changes = fromBody(userId, addressId, body);
        if (addressMapper.update(changes) == 0)
        {
            throw new ServiceException("收货地址不存在");
        }
        if (Boolean.TRUE.equals(body.getIsDefault()))
        {
            addressMapper.clearDefault(userId);
            requireDefaultUpdated(addressMapper.setDefault(userId, addressId));
        }
        return ShopUserAddressView.from(requireAddress(userId, addressId));
    }

    @Transactional
    public ShopUserAddressView setDefault(long addressId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        requireAddress(userId, addressId);
        addressMapper.clearDefault(userId);
        requireDefaultUpdated(addressMapper.setDefault(userId, addressId));
        return ShopUserAddressView.from(requireAddress(userId, addressId));
    }

    @Transactional
    public void delete(long addressId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        ShopUserAddress address = requireAddress(userId, addressId);
        if (addressMapper.softDelete(userId, addressId) == 0)
        {
            throw new ServiceException("收货地址不存在");
        }
        if (Boolean.TRUE.equals(address.getIsDefault()))
        {
            Long replacementId = addressMapper.selectFirstAddressId(userId);
            if (replacementId != null)
            {
                requireDefaultUpdated(addressMapper.setDefault(userId, replacementId));
            }
        }
    }

    private void lockUser(long userId)
    {
        if (addressMapper.lockEnabledUser(userId) == null)
        {
            throw new ServiceException("商城用户不存在或已停用");
        }
    }

    private ShopUserAddress requireAddress(long userId, long addressId)
    {
        ShopUserAddress address = addressMapper.selectUserAddress(userId, addressId);
        if (address == null)
        {
            throw new ServiceException("收货地址不存在");
        }
        return address;
    }

    private void requireDefaultUpdated(int rows)
    {
        if (rows == 0)
        {
            throw new ServiceException("默认地址设置失败");
        }
    }

    private ShopUserAddress fromBody(long userId, Long addressId, ShopUserAddressBody body)
    {
        ShopUserAddress address = new ShopUserAddress();
        address.setAddressId(addressId);
        address.setUserId(userId);
        address.setRecipient(StringUtils.trim(body.getRecipient()));
        address.setPhone(StringUtils.trim(body.getPhone()));
        address.setProvinceCode(StringUtils.trim(body.getRegion().get(0)));
        address.setCityCode(StringUtils.trim(body.getRegion().get(1)));
        address.setDistrictCode(StringUtils.trim(body.getRegion().get(2)));
        address.setDetail(StringUtils.trim(body.getDetail()));
        return address;
    }
}
