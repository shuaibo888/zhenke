package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopPasswordBody;
import com.ruoyi.shop.domain.dto.ShopProfileBody;
import com.ruoyi.shop.service.ShopAccountService;

@RestController
@RequestMapping("/shop/users/me")
public class ShopUserController
{
    private final ShopAccountService accountService;

    public ShopUserController(ShopAccountService accountService)
    {
        this.accountService = accountService;
    }

    @GetMapping
    public AjaxResult profile()
    {
        return AjaxResult.success(accountService.currentProfile());
    }

    @PutMapping
    public AjaxResult updateProfile(@Valid @RequestBody ShopProfileBody body)
    {
        return AjaxResult.success(accountService.updateProfile(body));
    }

    @PutMapping("/password")
    public AjaxResult updatePassword(@Valid @RequestBody ShopPasswordBody body)
    {
        accountService.updatePassword(body);
        return AjaxResult.success("密码修改成功");
    }
}
