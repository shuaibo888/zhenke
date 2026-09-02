package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.dto.ShopPasswordBody;
import com.ruoyi.shop.domain.dto.ShopOneClickBody;
import com.ruoyi.shop.domain.dto.ShopPhoneBindBody;
import com.ruoyi.shop.domain.dto.ShopPhoneChangeBody;
import com.ruoyi.shop.domain.dto.ShopProfileBody;
import com.ruoyi.shop.domain.dto.ShopSmsSendBody;
import com.ruoyi.shop.domain.dto.ShopUsernameInitializeBody;
import com.ruoyi.shop.domain.vo.ShopUserProfile;
import com.ruoyi.shop.phone.AliyunPhoneAuthService;
import com.ruoyi.shop.phone.PhoneVerificationScene;
import com.ruoyi.shop.service.ShopAccountService;
import com.ruoyi.shop.service.ShopUserOverviewService;

@RestController
@RequestMapping("/shop/users/me")
public class ShopUserController extends BaseController
{
    private final ShopAccountService accountService;
    private final ShopUserOverviewService overviewService;
    private final AliyunPhoneAuthService phoneAuthService;

    public ShopUserController(ShopAccountService accountService, ShopUserOverviewService overviewService,
            AliyunPhoneAuthService phoneAuthService)
    {
        this.accountService = accountService;
        this.overviewService = overviewService;
        this.phoneAuthService = phoneAuthService;
    }

    @GetMapping
    public AjaxResult profile()
    {
        return AjaxResult.success(accountService.currentProfile());
    }

    @GetMapping("/overview")
    public AjaxResult overview()
    {
        return AjaxResult.success(overviewService.overview());
    }

    @GetMapping("/useful-content")
    public TableDataInfo usefulContent(
            @RequestParam(defaultValue = "POST") String type,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "12") int pageSize)
    {
        return getDataTable(overviewService.usefulContent(type, pageNum, pageSize));
    }

    @PutMapping
    public AjaxResult updateProfile(@Valid @RequestBody ShopProfileBody body)
    {
        return AjaxResult.success(accountService.updateProfile(body));
    }

    @PutMapping("/username")
    public AjaxResult initializeUsername(@Valid @RequestBody ShopUsernameInitializeBody body)
    {
        return AjaxResult.success(accountService.initializeUsername(body.getUsername()));
    }

    @PostMapping("/avatar")
    public AjaxResult updateAvatar(@RequestParam("file") MultipartFile file)
    {
        return AjaxResult.success(accountService.updateAvatar(file));
    }

    @PutMapping("/password")
    public AjaxResult updatePassword(@Valid @RequestBody ShopPasswordBody body)
    {
        boolean phoneVerified = body.getSmsCode() != null && !body.getSmsCode().isBlank();
        if (phoneVerified)
        {
            phoneAuthService.verifyCode(accountService.currentPhone(), body.getSmsCode(),
                    PhoneVerificationScene.RESET_PASSWORD);
        }
        accountService.updatePassword(body, phoneVerified);
        return AjaxResult.success("密码修改成功");
    }

    @PostMapping("/phone/sms/send")
    public AjaxResult sendPhoneSms(@Valid @RequestBody ShopSmsSendBody body)
    {
        String currentPhone = accountService.currentPhone();
        String phone;
        switch (body.getScene())
        {
            case BIND_PHONE -> {
                phone = phoneAuthService.normalizePhone(body.getPhone());
                if (currentPhone != null && !currentPhone.isBlank()) return AjaxResult.error("当前账号已经绑定手机号");
                accountService.requirePhoneAvailable(phone);
            }
            case CHANGE_PHONE -> {
                phone = phoneAuthService.normalizePhone(body.getPhone());
                if (currentPhone == null || currentPhone.isBlank()) return AjaxResult.error("请先绑定手机号");
                if (currentPhone.equals(phone)) return AjaxResult.error("新手机号不能与当前手机号相同");
                accountService.requirePhoneAvailable(phone);
            }
            case RESET_PASSWORD -> {
                if (currentPhone == null || currentPhone.isBlank()) return AjaxResult.error("请先绑定手机号");
                phone = currentPhone;
            }
            case LOGIN_REGISTER -> {
                return AjaxResult.error("请使用登录页验证码接口");
            }
            default -> {
                return AjaxResult.error("不支持的验证码场景");
            }
        }
        phoneAuthService.sendCode(phone, body.getScene());
        return AjaxResult.success("验证码已发送");
    }

    @PutMapping("/phone/bind")
    public AjaxResult bindPhone(@Valid @RequestBody ShopPhoneBindBody body)
    {
        String phone = phoneAuthService.normalizePhone(body.getPhone());
        phoneAuthService.verifyCode(phone, body.getCode(), PhoneVerificationScene.BIND_PHONE);
        return AjaxResult.success(accountService.bindVerifiedPhone(phone));
    }

    @PutMapping("/phone/one-click-bind")
    public AjaxResult oneClickBind(@Valid @RequestBody ShopOneClickBody body)
    {
        String phone = phoneAuthService.getPhoneByOneClickToken(body.getSpToken());
        return AjaxResult.success(accountService.bindVerifiedPhone(phone));
    }

    @PutMapping("/phone")
    public AjaxResult changePhone(@Valid @RequestBody ShopPhoneChangeBody body)
    {
        String newPhone = phoneAuthService.normalizePhone(body.getNewPhone());
        phoneAuthService.verifyCode(newPhone, body.getNewPhoneCode(), PhoneVerificationScene.CHANGE_PHONE);
        ShopUserProfile updated = accountService.changeVerifiedPhone(newPhone);
        return AjaxResult.success(updated);
    }
}
