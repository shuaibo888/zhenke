package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopUserAddressBody;
import com.ruoyi.shop.service.ShopUserAddressService;

@RestController
@RequestMapping("/shop/users/me/addresses")
public class ShopUserAddressController
{
    private final ShopUserAddressService addressService;

    public ShopUserAddressController(ShopUserAddressService addressService)
    {
        this.addressService = addressService;
    }

    @GetMapping
    public AjaxResult list()
    {
        return AjaxResult.success(addressService.myAddresses());
    }

    @PostMapping
    public AjaxResult create(@Valid @RequestBody ShopUserAddressBody body)
    {
        return AjaxResult.success(addressService.create(body));
    }

    @PutMapping("/{addressId}")
    public AjaxResult update(@PathVariable long addressId, @Valid @RequestBody ShopUserAddressBody body)
    {
        return AjaxResult.success(addressService.update(addressId, body));
    }

    @PutMapping("/{addressId}/default")
    public AjaxResult setDefault(@PathVariable long addressId)
    {
        return AjaxResult.success(addressService.setDefault(addressId));
    }

    @DeleteMapping("/{addressId}")
    public AjaxResult delete(@PathVariable long addressId)
    {
        addressService.delete(addressId);
        return AjaxResult.success("收货地址已删除");
    }
}
