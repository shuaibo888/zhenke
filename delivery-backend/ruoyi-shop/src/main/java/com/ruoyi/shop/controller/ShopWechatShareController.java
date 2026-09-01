package com.ruoyi.shop.controller;

import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.payment.WechatJsSdkService;
import com.ruoyi.shop.payment.WechatShareImageService;
import com.ruoyi.shop.payment.WechatShareLandingService;
import com.ruoyi.shop.payment.WechatShareLandingService.ShareLanding;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Anonymous
@RestController
@RequestMapping("/shop/wechat")
public class ShopWechatShareController
{
    private final WechatJsSdkService jsSdkService;
    private final WechatShareImageService shareImageService;
    private final WechatShareLandingService shareLandingService;

    public ShopWechatShareController(WechatJsSdkService jsSdkService,
            WechatShareImageService shareImageService,
            WechatShareLandingService shareLandingService)
    {
        this.jsSdkService = jsSdkService;
        this.shareImageService = shareImageService;
        this.shareLandingService = shareLandingService;
    }

    @GetMapping("/js-sdk/signature")
    public ResponseEntity<AjaxResult> signature(@RequestParam String url)
    {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(AjaxResult.success(jsSdkService.signature(url)));
    }

    @GetMapping(value = "/share/posts/{postId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> postShare(@PathVariable long postId)
    {
        return sharePage(shareLandingService.post(postId));
    }

    @GetMapping(value = "/share/posts/{postId}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> postShareImage(@PathVariable long postId)
    {
        return shareImage(shareLandingService.post(postId));
    }

    @GetMapping(value = "/share/products/{productId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> productShare(@PathVariable long productId,
            @RequestParam(required = false) Long campaign)
    {
        return sharePage(shareLandingService.product(productId, campaign));
    }

    @GetMapping(value = "/share/products/{productId}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> productShareImage(@PathVariable long productId,
            @RequestParam(required = false) Long campaign)
    {
        return shareImage(shareLandingService.product(productId, campaign));
    }

    @GetMapping(value = "/share/reports/{reportId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> reportShare(@PathVariable long reportId)
    {
        return sharePage(shareLandingService.report(reportId));
    }

    @GetMapping(value = "/share/reports/{reportId}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> reportShareImage(@PathVariable long reportId)
    {
        return shareImage(shareLandingService.report(reportId));
    }

    @GetMapping(value = "/share/enjoy/{enjoyId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> enjoyShare(@PathVariable long enjoyId)
    {
        return sharePage(shareLandingService.enjoy(enjoyId));
    }

    @GetMapping(value = "/share/enjoy/{enjoyId}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> enjoyShareImage(@PathVariable long enjoyId)
    {
        return shareImage(shareLandingService.enjoy(enjoyId));
    }

    private ResponseEntity<String> sharePage(ShareLanding landing)
    {
        MediaType htmlUtf8 = new MediaType("text", "html", StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(htmlUtf8)
                .header("X-Content-Type-Options", "nosniff")
                .header("Referrer-Policy", "strict-origin-when-cross-origin")
                .body(shareLandingService.render(landing));
    }

    private ResponseEntity<byte[]> shareImage(ShareLanding landing)
    {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .contentType(MediaType.IMAGE_JPEG)
                .header("X-Content-Type-Options", "nosniff")
                .body(shareImageService.render(landing.imageSource()));
    }
}
