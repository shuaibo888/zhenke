package com.ruoyi.shop.controller;

import java.nio.file.Path;
import jakarta.validation.Valid;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.shop.domain.ShopProductCertification;
import com.ruoyi.shop.domain.ShopProductCertificationMaterial;
import com.ruoyi.shop.domain.dto.ShopProductCertificationSubmitBody;
import com.ruoyi.shop.service.ShopMerchantService;
import com.ruoyi.shop.service.ShopProductCertificationService;

@RestController
@RequestMapping("/shop/merchant/products")
public class ShopProductCertificationController extends BaseController
{
    private final ShopMerchantService merchantService;
    private final ShopProductCertificationService certificationService;

    public ShopProductCertificationController(ShopMerchantService merchantService,
            ShopProductCertificationService certificationService)
    {
        this.merchantService = merchantService;
        this.certificationService = certificationService;
    }

    @PreAuthorize("@ss.hasPermi('shop:product:query')")
    @GetMapping("/{productId}/certification")
    public AjaxResult detail(@PathVariable long productId)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        ShopProductCertification certification = certificationService.latest(merchantId, productId);
        return AjaxResult.success(certification);
    }

    @Log(title = "申请商品平台AI认证", businessType = BusinessType.INSERT)
    @PreAuthorize("@ss.hasPermi('shop:product:edit')")
    @PostMapping(value = "/{productId}/certification", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AjaxResult submit(@PathVariable long productId,
            @Valid @ModelAttribute ShopProductCertificationSubmitBody body)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        return AjaxResult.success("平台AI认证申请已提交",
                certificationService.submit(merchantId, productId, body, getUsername()));
    }

    @PreAuthorize("@ss.hasPermi('shop:product:query')")
    @GetMapping("/{productId}/certification/materials/{materialId}")
    public ResponseEntity<Resource> material(@PathVariable long productId, @PathVariable long materialId)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        ShopProductCertificationMaterial material = certificationService.material(
                merchantId, productId, materialId);
        Path path = certificationService.materialPath(material);
        MediaType mediaType;
        try
        {
            mediaType = MediaType.parseMediaType(material.getContentType());
        }
        catch (Exception exception)
        {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(material.getSizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(material.getOriginalName(), java.nio.charset.StandardCharsets.UTF_8)
                        .build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(new PathResource(path));
    }
}
