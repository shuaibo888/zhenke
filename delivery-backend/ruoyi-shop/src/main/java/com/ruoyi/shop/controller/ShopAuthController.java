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
import com.ruoyi.shop.domain.dto.ShopOneClickBody;
import com.ruoyi.shop.domain.dto.ShopPhoneLoginBody;
import com.ruoyi.shop.domain.dto.ShopRegisterBody;
import com.ruoyi.shop.domain.dto.ShopSmsSendBody;
import com.ruoyi.shop.domain.dto.ShopSsoLoginBody;
import com.ruoyi.shop.phone.AliyunPhoneAuthService;
import com.ruoyi.shop.phone.PhoneVerificationScene;
import com.ruoyi.shop.service.ShopAccountService;
import com.ruoyi.shop.service.ShopAccountService.LoginResult;
import com.ruoyi.shop.sso.EventSsoIdentity;
import com.ruoyi.shop.sso.EventSsoService;

@RestController
@RequestMapping("/shop/auth")
public class ShopAuthController {
    private final ShopAccountService accountService;
    private final AliyunPhoneAuthService phoneAuthService;
    private final EventSsoService eventSsoService;

    public ShopAuthController(ShopAccountService accountService, AliyunPhoneAuthService phoneAuthService,
            EventSsoService eventSsoService) {
        this.accountService = accountService;
        this.phoneAuthService = phoneAuthService;
        this.eventSsoService = eventSsoService;
    }

    @Anonymous
    @PostMapping("/register")
    public AjaxResult register(@Valid @RequestBody ShopRegisterBody body) {
        accountService.register(body);
        return AjaxResult.success("注册成功，请登录");
    }

    @Anonymous
    @PostMapping("/login")
    public AjaxResult login(@Valid @RequestBody ShopLoginBody body) {
        LoginResult result = accountService.login(body);
        return AjaxResult.success()
                .put(Constants.TOKEN, result.token())
                .put("user", result.user());
    }

    @Anonymous
    @org.springframework.web.bind.annotation.GetMapping("/phone/capabilities")
    public AjaxResult phoneCapabilities() {
        return AjaxResult.success(phoneAuthService.capabilities());
    }

    @Anonymous
    @PostMapping("/phone/sms/send")
    public AjaxResult sendLoginSms(@Valid @RequestBody ShopSmsSendBody body) {
        if (body.getScene() != PhoneVerificationScene.LOGIN_REGISTER) {
            return AjaxResult.error("匿名接口只允许发送登录/注册验证码");
        }
        phoneAuthService.sendCode(body.getPhone(), PhoneVerificationScene.LOGIN_REGISTER);
        return AjaxResult.success("验证码已发送");
    }

    @Anonymous
    @PostMapping("/phone/login")
    public AjaxResult phoneLogin(@Valid @RequestBody ShopPhoneLoginBody body) {
        String phone = phoneAuthService.normalizePhone(body.getPhone());
        phoneAuthService.verifyCode(phone, body.getCode(), PhoneVerificationScene.LOGIN_REGISTER);
        LoginResult result = accountService.loginByVerifiedPhone(phone);
        return AjaxResult.success().put(Constants.TOKEN, result.token()).put("user", result.user());
    }

    @Anonymous
    @PostMapping("/phone/one-click/tokens")
    public AjaxResult oneClickTokens() {
        return AjaxResult.success(phoneAuthService.getH5AuthTokens());
    }

    @Anonymous
    @PostMapping("/phone/one-click/login")
    public AjaxResult oneClickLogin(@Valid @RequestBody ShopOneClickBody body) {
        String phone = phoneAuthService.getPhoneByOneClickToken(body.getSpToken());
        LoginResult result = accountService.loginByVerifiedPhone(phone);
        return AjaxResult.success().put(Constants.TOKEN, result.token()).put("user", result.user());
    }

    @Anonymous
    @PostMapping("/sso/login")
    public AjaxResult ssoLogin(@Valid @RequestBody ShopSsoLoginBody body) {
        EventSsoIdentity identity = eventSsoService.exchangeTicket(body.getTicket());
        LoginResult result = accountService.loginByVerifiedPhone(identity.phone(), identity.nickname());
        return AjaxResult.success().put(Constants.TOKEN, result.token()).put("user", result.user());
    }
}
