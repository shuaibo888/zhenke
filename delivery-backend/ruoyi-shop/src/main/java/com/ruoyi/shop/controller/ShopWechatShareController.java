package com.ruoyi.shop.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.payment.WechatJsSdkService;

@Anonymous
@RestController
@RequestMapping("/shop/wechat")
public class ShopWechatShareController
{
    private final WechatJsSdkService jsSdkService;

    public ShopWechatShareController(WechatJsSdkService jsSdkService)
    {
        this.jsSdkService = jsSdkService;
    }

    @GetMapping("/js-sdk/signature")
    public AjaxResult signature(@RequestParam String url)
    {
        return AjaxResult.success(jsSdkService.signature(url));
    }
}
