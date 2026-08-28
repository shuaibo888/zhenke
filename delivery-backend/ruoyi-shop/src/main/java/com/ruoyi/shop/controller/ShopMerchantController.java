package com.ruoyi.shop.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.shop.domain.ShopMerchantProofMedia;
import com.ruoyi.shop.domain.dto.ShopMerchantApplyBody;
import com.ruoyi.shop.domain.dto.ShopMerchantLicenseVerifyBody;
import com.ruoyi.shop.domain.dto.ShopMerchantQueryBody;
import com.ruoyi.shop.qualification.AliyunLicenseService;
import com.ruoyi.shop.qualification.LicenseVerifyResult;
import com.ruoyi.shop.domain.vo.ShopMerchantPublicView;
import com.ruoyi.shop.map.TencentMapService;
import com.ruoyi.shop.service.ShopMerchantService;
import com.ruoyi.shop.util.ShopPlatformMediaPathUtils;

@RestController
@RequestMapping("/shop/merchants")
public class ShopMerchantController {
    private final ShopMerchantService merchantService;
    private final ServerConfig serverConfig;
    private final AliyunLicenseService licenseService;
    private final TencentMapService tencentMapService;

    public ShopMerchantController(ShopMerchantService merchantService, ServerConfig serverConfig,
            AliyunLicenseService licenseService, TencentMapService tencentMapService) {
        this.merchantService = merchantService;
        this.serverConfig = serverConfig;
        this.licenseService = licenseService;
        this.tencentMapService = tencentMapService;
    }

    @Anonymous
    @PostMapping("/license")
    public AjaxResult uploadBusinessLicense(@RequestParam("file") MultipartFile file) {
        String fileName = merchantService.uploadBusinessLicense(file);
        AjaxResult result = AjaxResult.success("营业执照上传成功");
        result.put("fileName", fileName);
        result.put("url", serverConfig.getUrl() + fileName);
        LicenseVerifyResult license = licenseService.recognize(fileName);
        if (license.isRecognized()) {
            Map<String, String> recognized = new LinkedHashMap<>();
            recognized.put("creditCode", license.getCreditCode());
            recognized.put("companyName", license.getCompanyName());
            recognized.put("businessAddress", license.getBusinessAddress());
            recognized.put("legalPerson", license.getLegalPerson());
            result.put("recognized", recognized);
        }
        result.put("verifyMessage", license.getVerifyMessage());
        return result;
    }

    @Anonymous
    @PostMapping("/proof-media")
    public AjaxResult uploadStoreProofMedia(@RequestParam("file") MultipartFile file) {
        ShopMerchantProofMedia media = merchantService.uploadStoreProofMedia(file);
        AjaxResult result = AjaxResult.success("门店证明材料上传成功");
        result.put("mediaType", media.getMediaType());
        result.put("fileName", media.getMediaUrl());
        result.put("url", serverConfig.getUrl() + media.getMediaUrl());
        return result;
    }

    @Anonymous
    @PostMapping("/license/verify")
    public AjaxResult verifyBusinessLicense(@Valid @RequestBody ShopMerchantLicenseVerifyBody body) {
        LicenseVerifyResult license = licenseService.verify(
                resourcePathOf(body.getUrl()), body.getCreditCode(), body.getCompanyName(), body.getLegalPerson());
        AjaxResult result = AjaxResult.success("营业执照核验完成");
        result.put("verified", license.isVerified());
        result.put("verifyMessage", license.getVerifyMessage());
        return result;
    }

    private String resourcePathOf(String url) {
        return ShopPlatformMediaPathUtils.normalize(url);
    }

    @Anonymous
    @PostMapping("/status")
    public AjaxResult applicationStatus(@Valid @RequestBody ShopMerchantQueryBody body) {
        return AjaxResult.success(merchantService.applicationStatus(body));
    }

    @Anonymous
    @GetMapping("/public/{merchantId}")
    public AjaxResult publicDetail(@PathVariable long merchantId) {
        return AjaxResult.success(merchantService.publicDetail(merchantId));
    }

    @Anonymous
    @GetMapping("/public/{merchantId}/navigation")
    public ResponseEntity<Void> navigate(@PathVariable long merchantId) {
        ShopMerchantPublicView merchant = merchantService.publicDetail(merchantId);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, tencentMapService.navigationUri(merchant).toASCIIString())
                .build();
    }

    @Anonymous
    @PostMapping("/apply")
    public AjaxResult apply(@Valid @RequestBody ShopMerchantApplyBody body) {
        return AjaxResult.success("商家入驻申请已提交", merchantService.apply(body));
    }
}
