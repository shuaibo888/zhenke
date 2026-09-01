package com.ruoyi.shop.payment;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
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
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/** Builds content-specific metadata pages for WeChat link-card crawlers. */
@Service
public class WechatShareLandingService
{
    private static final int TITLE_LIMIT = 80;
    private static final int DESCRIPTION_LIMIT = 160;

    private final ShopZhenkeService zhenkeService;
    private final ShopProductService productService;
    private final ShopTrialService trialService;
    private final ShopZhenkeEnjoyService enjoyService;
    private final WechatPayProperties properties;

    public WechatShareLandingService(ShopZhenkeService zhenkeService,
            ShopProductService productService,
            ShopTrialService trialService,
            ShopZhenkeEnjoyService enjoyService,
            WechatPayProperties properties)
    {
        this.zhenkeService = zhenkeService;
        this.productService = productService;
        this.trialService = trialService;
        this.enjoyService = enjoyService;
        this.properties = properties;
    }

    public ShareLanding post(long postId)
    {
        ShopZhenkePost post = zhenkeService.detail(postId);
        String origin = publicOrigin();
        String author = firstText(post.getNickName(), post.getUserName(), "甄客行用户");
        String imageSource = firstPostImage(post.getResources());
        return landing(
                "甄客帖｜" + post.getTitle(),
                author + "：" + post.getContent(),
                imageSource,
                origin + "/posts/" + postId,
                origin + "/api/shop/wechat/share/posts/" + postId + "/image");
    }

    public ShareLanding product(long productId, Long campaignId)
    {
        ShopProduct product = productService.publicProduct(productId);
        ShopTrialCampaign campaign = matchingPublicCampaign(productId, campaignId);
        String origin = publicOrigin();
        String destination = origin + "/products/" + productId;
        String imageEndpoint = origin + "/api/shop/wechat/share/products/" + productId + "/image";
        String description;
        String imageSource;
        if (campaign != null)
        {
            destination += "?campaign=" + campaign.getCampaignId();
            imageEndpoint += "?campaign=" + campaign.getCampaignId();
            description = firstText(campaign.getCampaignSummary(), product.getSubtitle(),
                    product.getDetail(), product.getMerchantName() + " · " + product.getCategoryName());
            imageSource = firstText(campaign.getProductCoverUrl(), product.getCoverUrl());
        }
        else
        {
            description = firstText(product.getSubtitle(), product.getDetail(),
                    product.getMerchantName() + " · " + product.getCategoryName());
            imageSource = product.getCoverUrl();
        }
        return landing(
                firstText(product.getBrandName(), "") + " " + product.getProductName(),
                description,
                imageSource,
                destination,
                imageEndpoint);
    }

    public ShareLanding report(long reportId)
    {
        ShopVerificationReport report = trialService.publishedReport(reportId);
        String origin = publicOrigin();
        String author = firstText(report.getNickName(), report.getUserName(), "甄客行用户");
        String imageSource = firstReportImage(report.getResources());
        if (isBlank(imageSource)) imageSource = report.getProductCoverUrl();
        return landing(
                "甄客验｜" + productDisplayName(report),
                author + "：" + firstText(report.getExperience(), report.getTitle(), "真实消费体验"),
                imageSource,
                origin + "/reports/" + reportId,
                origin + "/api/shop/wechat/share/reports/" + reportId + "/image");
    }

    private String productDisplayName(ShopVerificationReport report)
    {
        String productName = firstText(report.getProductName(), report.getTitle(), "真实体验");
        String brandName = firstText(report.getProductBrandName());
        return isBlank(brandName) ? productName : brandName + " " + productName;
    }

    public ShareLanding enjoy(long enjoyId)
    {
        ShopZhenkeEnjoy enjoy = enjoyService.detail(enjoyId);
        String origin = publicOrigin();
        return landing(
                "甄必享｜" + enjoy.getTitle(),
                firstText(enjoy.getSubtitle(), enjoy.getServiceSummary(), enjoy.getContent()),
                enjoy.getCoverUrl(),
                origin + "/enjoy/" + enjoyId,
                origin + "/api/shop/wechat/share/enjoy/" + enjoyId + "/image");
    }

    public String render(ShareLanding source)
    {
        String title = html(shorten(source.title(), TITLE_LIMIT));
        String description = html(shorten(source.description(), DESCRIPTION_LIMIT));
        String image = html(source.imageUrl());
        String destination = html(source.destinationUrl());
        return "<!doctype html><html lang=\"zh-CN\"><head>"
                + "<meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>" + title + "</title>"
                + "<meta name=\"description\" content=\"" + description + "\">"
                + "<meta property=\"og:type\" content=\"website\">"
                + "<meta property=\"og:site_name\" content=\"甄客行\">"
                + "<meta property=\"og:title\" content=\"" + title + "\">"
                + "<meta property=\"og:description\" content=\"" + description + "\">"
                + "<meta property=\"og:image\" content=\"" + image + "\">"
                + "<meta property=\"og:image:secure_url\" content=\"" + image + "\">"
                + "<meta property=\"og:image:type\" content=\"image/jpeg\">"
                + "<meta property=\"og:image:width\" content=\"360\">"
                + "<meta property=\"og:image:height\" content=\"360\">"
                + "<meta property=\"og:url\" content=\"" + destination + "\">"
                + "<meta itemprop=\"name\" content=\"" + title + "\">"
                + "<meta itemprop=\"description\" content=\"" + description + "\">"
                + "<meta itemprop=\"image\" content=\"" + image + "\">"
                + "<link rel=\"image_src\" href=\"" + image + "\">"
                + "<link rel=\"canonical\" href=\"" + destination + "\">"
                + "</head><body>"
                + "<main><h1>" + title + "</h1><p>" + description + "</p>"
                + "<p><a id=\"destination\" href=\"" + destination + "\">正在打开甄客行详情</a></p></main>"
                + "<script>(function(){"
                + "var link=document.getElementById('destination');if(!link)return;"
                + "var target=new URL(link.href);"
                + "if(window.location.pathname!==target.pathname||window.location.search!==target.search)"
                + "{window.location.replace(target.href);return;}"
                + "fetch('/index.html',{cache:'no-store',credentials:'same-origin'})"
                + ".then(function(response){if(!response.ok)throw new Error('shell');return response.text();})"
                + ".then(function(shell){document.open();document.write(shell);document.close();})"
                + ".catch(function(){window.location.replace(target.href);});"
                + "})();</script>"
                + "</body></html>";
    }

    private ShareLanding landing(String title, String description, String imageSource,
            String destination, String imageEndpoint)
    {
        return new ShareLanding(title, description, imageSource,
                shareImage(imageEndpoint), destination);
    }

    private ShopTrialCampaign matchingPublicCampaign(long productId, Long campaignId)
    {
        if (campaignId == null || campaignId <= 0) return null;
        try
        {
            ShopTrialCampaign campaign = trialService.publicCampaign(campaignId);
            return campaign.getProductId() != null && campaign.getProductId() == productId
                    ? campaign : null;
        }
        catch (ServiceException exception)
        {
            // A stale/closed trial link should still open the public product instead of failing.
            return null;
        }
    }

    private String shareImage(String imageEndpoint)
    {
        return imageEndpoint;
    }

    private String publicOrigin()
    {
        String configured = properties == null ? null : StringUtils.trim(properties.getFrontendReturnUrl());
        if (StringUtils.isEmpty(configured)) throw new ServiceException("微信分享暂未配置");
        try
        {
            URI value = URI.create(configured);
            if (!"https".equalsIgnoreCase(value.getScheme()) || value.getHost() == null
                    || value.getUserInfo() != null)
            {
                throw new ServiceException("微信分享站点配置无效");
            }
            return new URI("https", null, value.getHost(), value.getPort(), null, null, null)
                    .toString();
        }
        catch (IllegalArgumentException | URISyntaxException exception)
        {
            throw new ServiceException("微信分享站点配置无效");
        }
    }

    private String firstPostImage(List<ShopZhenkePostResource> resources)
    {
        if (resources == null) return "";
        return resources.stream()
                .filter(item -> "IMAGE".equals(item.getResourceType()))
                .map(ShopZhenkePostResource::getResourceUrl)
                .filter(value -> !isBlank(value))
                .findFirst()
                .orElse("");
    }

    private String firstReportImage(List<ShopVerificationReportResource> resources)
    {
        if (resources == null) return "";
        return resources.stream()
                .filter(item -> "IMAGE".equals(item.getResourceType()))
                .map(ShopVerificationReportResource::getResourceUrl)
                .filter(value -> !isBlank(value))
                .findFirst()
                .orElse("");
    }

    private String firstText(String... values)
    {
        for (String value : values)
        {
            if (!isBlank(value)) return value.trim();
        }
        return "";
    }

    private String shorten(String value, int maximum)
    {
        String plain = firstText(value)
                .replaceAll("<[^>]+>", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (plain.length() <= maximum) return plain;
        return plain.substring(0, maximum - 1) + "…";
    }

    private boolean isBlank(String value)
    {
        return value == null || value.trim().isEmpty();
    }

    private String html(String value)
    {
        return HtmlUtils.htmlEscape(value == null ? "" : value, StandardCharsets.UTF_8.name());
    }

    public record ShareLanding(String title, String description, String imageSource,
            String imageUrl, String destinationUrl)
    {
    }
}
