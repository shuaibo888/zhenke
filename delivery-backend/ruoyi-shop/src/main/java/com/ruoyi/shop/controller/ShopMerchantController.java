package com.ruoyi.shop.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.shop.domain.dto.ShopMerchantApplyBody;
import com.ruoyi.shop.domain.dto.ShopMerchantQueryBody;
import com.ruoyi.shop.service.ShopMerchantService;

@RestController
@RequestMapping("/shop/merchants")
public class ShopMerchantController {
    private final ShopMerchantService merchantService;
    private final ServerConfig serverConfig;

    public ShopMerchantController(ShopMerchantService merchantService, ServerConfig serverConfig) {
        this.merchantService = merchantService;
        this.serverConfig = serverConfig;
    }

    @Anonymous
    @PostMapping("/license")
    public AjaxResult uploadBusinessLicense(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "uuid", required = false) String uuid) {
        String fileName = merchantService.uploadBusinessLicense(file, code, uuid);
        AjaxResult result = AjaxResult.success("营业执照上传成功");
        result.put("fileName", fileName);
        result.put("url", serverConfig.getUrl() + fileName);
        return result;
    }

    @Anonymous
    @PostMapping("/status")
    public AjaxResult applicationStatus(@Valid @RequestBody ShopMerchantQueryBody body) {
        return AjaxResult.success(merchantService.applicationStatus(body));
    }

    @Anonymous
    @PostMapping("/apply")
    public AjaxResult apply(@Valid @RequestBody ShopMerchantApplyBody body) {
        return AjaxResult.success("商家入驻申请已提交", merchantService.apply(body));
    }
}
