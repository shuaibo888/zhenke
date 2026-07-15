package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.ShopLoginBody;
import com.ruoyi.shop.domain.dto.ShopRegisterBody;
import com.ruoyi.shop.service.ShopAccountService;
import com.ruoyi.shop.service.ShopAccountService.LoginResult;

@RestController
@RequestMapping("/shop/auth")
public class ShopAuthController
{
    private final ShopAccountService accountService;

    public ShopAuthController(ShopAccountService accountService)
    {
        this.accountService = accountService;
    }

    @Anonymous
    @PostMapping("/register")
    public AjaxResult register(@Valid @RequestBody ShopRegisterBody body)
    {
        accountService.register(body);
        return AjaxResult.success("注册成功，请登录");
    }

    @Anonymous
    @PostMapping("/login")
    public AjaxResult login(@Valid @RequestBody ShopLoginBody body)
    {
        LoginResult result = accountService.login(body);
        return AjaxResult.success()
                .put(Constants.TOKEN, result.token())
                .put("user", result.user());
    }
}
