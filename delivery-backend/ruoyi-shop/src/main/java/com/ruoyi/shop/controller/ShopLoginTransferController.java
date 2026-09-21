package com.ruoyi.shop.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.shop.domain.dto.ShopSsoLoginBody;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.sso.ShopLoginTransferService;

@RestController
@RequestMapping("/shop/auth/transfer")
public class ShopLoginTransferController
{
    private final ShopLoginTransferService service;
    private final TokenService tokens;

    public ShopLoginTransferController(ShopLoginTransferService service, TokenService tokens)
    {
        this.service = service;
        this.tokens = tokens;
    }

    @PostMapping("/orders/{orderId}")
    public AjaxResult create(@PathVariable long orderId, HttpServletResponse response)
    {
        response.setHeader("Cache-Control", "no-store");
        return AjaxResult.success(service.create(orderId));
    }

    @Anonymous
    @PostMapping("/login")
    public AjaxResult login(@Valid @RequestBody ShopSsoLoginBody body,
            HttpServletRequest request, HttpServletResponse response)
    {
        response.setHeader("Cache-Control", "no-store");
        var result = service.exchange(body.getTicket(), request.getHeader("User-Agent"));
        // Replace only the session on this browser, never log out the source browser or other devices.
        var previous = tokens.getLoginUser(request);
        if (previous != null && previous.getPermissions() != null
                && previous.getPermissions().contains(ShopAccountIdentity.SHOP_USER_PERMISSION))
        {
            tokens.delLoginUser(previous.getToken());
        }
        return AjaxResult.success().put(Constants.TOKEN, result.login().token())
                .put("user", result.login().user()).put("redirectPath", result.redirectPath());
    }
}
