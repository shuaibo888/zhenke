package com.ruoyi.shop.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopTrialCampaign;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportResource;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.ShopZhenkePostResource;
import com.ruoyi.shop.service.ShopProductService;
import com.ruoyi.shop.service.ShopTrialService;
import com.ruoyi.shop.service.ShopZhenkeEnjoyService;
import com.ruoyi.shop.service.ShopZhenkeService;
import java.util.List;
import org.junit.jupiter.api.Test;

class WechatShareLandingServiceTest
{
    private final ShopZhenkeService zhenkeService = mock(ShopZhenkeService.class);
    private final ShopProductService productService = mock(ShopProductService.class);
    private final ShopTrialService trialService = mock(ShopTrialService.class);
    private final ShopZhenkeEnjoyService enjoyService = mock(ShopZhenkeEnjoyService.class);
    private final WechatShareLandingService service = new WechatShareLandingService(
            zhenkeService, productService, trialService, enjoyService, properties());

    @Test
    void rendersCrawlerMetadataAndRedirectWithoutTrustingContentAsMarkup()
    {
        String html = service.render(new WechatShareLandingService.ShareLanding(
                "甄客帖｜标题 <测试>",
                "正文 <script>alert('x')</script>",
                "/profile/a.jpg",
                "https://dzshop.vip/api/shop/wechat/share/posts/1/image",
                "https://dzshop.vip/posts/1"));

        assertTrue(html.contains("<meta property=\"og:title\" content=\"甄客帖｜标题\">"));
        assertTrue(html.contains("<meta property=\"og:image\" content=\"https://dzshop.vip/api/shop/wechat/share/posts/1/image\">"));
        assertTrue(html.contains("<meta property=\"og:image:type\" content=\"image/jpeg\">"));
        assertTrue(html.contains("<meta property=\"og:image:width\" content=\"360\">"));
        assertTrue(html.contains("<meta property=\"og:image:height\" content=\"360\">"));
        assertTrue(html.contains("<meta property=\"og:url\" content=\"https://dzshop.vip/posts/1\">"));
        assertTrue(html.contains("href=\"https://dzshop.vip/posts/1\""));
        assertTrue(html.contains("fetch('/index.html'"));
        assertFalse(html.contains("<script>alert('x')</script>"));
    }

    @Test
    void usesMatchingRecruitingCampaignForTrialCard()
    {
        ShopProduct product = product(7L);
        ShopTrialCampaign campaign = new ShopTrialCampaign();
        campaign.setCampaignId(9L);
        campaign.setProductId(7L);
        campaign.setCampaignSummary("限时线下试用招募");
        campaign.setProductCoverUrl("/profile/trial/cover.jpg");
        when(productService.publicProduct(7L)).thenReturn(product);
        when(trialService.publicCampaign(9L)).thenReturn(campaign);

        WechatShareLandingService.ShareLanding result = service.product(7L, 9L);

        assertEquals("品牌 品牌商品", result.title());
        assertEquals("限时线下试用招募", result.description());
        assertEquals("/profile/trial/cover.jpg", result.imageSource());
        assertEquals("https://dzshop.vip/products/7?campaign=9", result.destinationUrl());
        assertEquals("https://dzshop.vip/api/shop/wechat/share/products/7/image?campaign=9",
                result.imageUrl());
    }

    @Test
    void buildsPostCardFromPublishedPostContent()
    {
        ShopZhenkePost post = new ShopZhenkePost();
        post.setPostId(3L);
        post.setTitle("探店记录");
        post.setContent("这家店的招牌菜值得专程来吃");
        post.setNickName("小甄");
        ShopZhenkePostResource image = new ShopZhenkePostResource();
        image.setResourceType("IMAGE");
        image.setResourceUrl("/profile/post/cover.jpg");
        post.setResources(List.of(image));
        when(zhenkeService.detail(3L)).thenReturn(post);

        WechatShareLandingService.ShareLanding result = service.post(3L);

        assertEquals("甄客帖｜探店记录", result.title());
        assertEquals("小甄：这家店的招牌菜值得专程来吃", result.description());
        assertEquals("/profile/post/cover.jpg", result.imageSource());
        assertEquals("https://dzshop.vip/posts/3", result.destinationUrl());
    }

    @Test
    void buildsReportCardWithBrandAndReportImage()
    {
        ShopVerificationReport report = new ShopVerificationReport();
        report.setReportId(5L);
        report.setProductBrandName("甄选");
        report.setProductName("山楂汁");
        report.setExperience("酸甜适中，配料表也很干净");
        report.setNickName("体验官");
        ShopVerificationReportResource image = new ShopVerificationReportResource();
        image.setResourceType("IMAGE");
        image.setResourceUrl("/profile/report/cover.jpg");
        report.setResources(List.of(image));
        when(trialService.publishedReport(5L)).thenReturn(report);

        WechatShareLandingService.ShareLanding result = service.report(5L);

        assertEquals("甄客验｜甄选 山楂汁", result.title());
        assertEquals("体验官：酸甜适中，配料表也很干净", result.description());
        assertEquals("/profile/report/cover.jpg", result.imageSource());
        assertEquals("https://dzshop.vip/reports/5", result.destinationUrl());
    }

    @Test
    void buildsEnjoyCardFromOfficialContent()
    {
        ShopZhenkeEnjoy enjoy = new ShopZhenkeEnjoy();
        enjoy.setEnjoyId(11L);
        enjoy.setTitle("周末住进古城");
        enjoy.setSubtitle("甄必住本周精选");
        enjoy.setCoverUrl("/profile/enjoy/cover.jpg");
        when(enjoyService.detail(11L)).thenReturn(enjoy);

        WechatShareLandingService.ShareLanding result = service.enjoy(11L);

        assertEquals("甄必享｜周末住进古城", result.title());
        assertEquals("甄必住本周精选", result.description());
        assertEquals("/profile/enjoy/cover.jpg", result.imageSource());
        assertEquals("https://dzshop.vip/enjoy/11", result.destinationUrl());
    }

    @Test
    void fallsBackToProductCardWhenCampaignIsStale()
    {
        when(productService.publicProduct(7L)).thenReturn(product(7L));
        when(trialService.publicCampaign(9L)).thenThrow(new ServiceException("试用活动不存在"));

        WechatShareLandingService.ShareLanding result = service.product(7L, 9L);

        assertEquals("商品说明", result.description());
        assertEquals("https://dzshop.vip/products/7", result.destinationUrl());
        assertEquals("https://dzshop.vip/api/shop/wechat/share/products/7/image",
                result.imageUrl());
    }

    private ShopProduct product(long productId)
    {
        ShopProduct product = new ShopProduct();
        product.setProductId(productId);
        product.setBrandName("品牌");
        product.setProductName("品牌商品");
        product.setSubtitle("商品说明");
        product.setCoverUrl("/profile/product/cover.jpg");
        return product;
    }

    private WechatPayProperties properties()
    {
        WechatPayProperties properties = new WechatPayProperties();
        properties.setFrontendReturnUrl("https://dzshop.vip/");
        return properties;
    }
}
