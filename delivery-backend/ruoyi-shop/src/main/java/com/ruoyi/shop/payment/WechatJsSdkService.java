package com.ruoyi.shop.payment;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.vo.WechatJsSdkSignature;

@Service
public class WechatJsSdkService
{
    private static final Logger log = LoggerFactory.getLogger(WechatJsSdkService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long EXPIRY_SAFETY_SECONDS = 300L;

    private final WechatPayProperties properties;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private volatile CachedCredential accessToken;
    private volatile CachedCredential jsApiTicket;

    public WechatJsSdkService(WechatPayProperties properties)
    {
        this.properties = properties;
    }

    public WechatJsSdkSignature signature(String pageUrl)
    {
        requireConfigured();
        String url = validateAndNormalizeUrl(pageUrl);
        long timestamp = Instant.now().getEpochSecond();
        String nonceStr = randomNonce();
        return new WechatJsSdkSignature(properties.getAppId(), timestamp, nonceStr,
                sign(requireJsApiTicket(), nonceStr, timestamp, url));
    }

    private synchronized String requireJsApiTicket()
    {
        if (isValid(jsApiTicket))
        {
            return jsApiTicket.value();
        }
        JSONObject payload = requestJson("https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token="
                + encode(requireAccessToken()) + "&type=jsapi", "JS-SDK ticket");
        if (payload.getIntValue("errcode") != 0 || StringUtils.isEmpty(payload.getString("ticket")))
        {
            int errorCode = payload.getIntValue("errcode");
            if (errorCode == 40001 || errorCode == 40014 || errorCode == 42001)
            {
                accessToken = null;
                payload = requestJson("https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token="
                        + encode(requireAccessToken()) + "&type=jsapi", "JS-SDK ticket");
            }
        }
        String ticket = payload.getString("ticket");
        if (payload.getIntValue("errcode") != 0 || StringUtils.isEmpty(ticket))
        {
            log.warn("Wechat JS-SDK ticket request failed, errcode={}", payload.getIntValue("errcode"));
            throw new ServiceException("微信分享签名获取失败，请稍后重试");
        }
        jsApiTicket = cache(ticket, payload.getLongValue("expires_in"));
        return ticket;
    }

    private synchronized String requireAccessToken()
    {
        if (isValid(accessToken))
        {
            return accessToken.value();
        }
        String url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid="
                + encode(properties.getAppId()) + "&secret=" + encode(properties.getAppSecret());
        JSONObject payload = requestJson(url, "access token");
        String token = payload.getString("access_token");
        if (StringUtils.isEmpty(token))
        {
            log.warn("Wechat access token request failed, errcode={}", payload.getIntValue("errcode"));
            throw new ServiceException("微信分享签名获取失败，请稍后重试");
        }
        accessToken = cache(token, payload.getLongValue("expires_in"));
        return token;
    }

    private JSONObject requestJson(String url, String resourceName)
    {
        try
        {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JSONObject payload = JSON.parseObject(response.body());
            if (response.statusCode() != 200 || payload == null)
            {
                throw new ServiceException("微信分享签名获取失败，请稍后重试");
            }
            return payload;
        }
        catch (InterruptedException exception)
        {
            Thread.currentThread().interrupt();
            throw new ServiceException("微信分享签名请求被中断");
        }
        catch (java.io.IOException | RuntimeException exception)
        {
            if (exception instanceof ServiceException serviceException)
            {
                throw serviceException;
            }
            log.warn("Wechat {} request failed", resourceName, exception);
            throw new ServiceException("微信分享签名获取失败，请稍后重试");
        }
    }

    private String validateAndNormalizeUrl(String pageUrl)
    {
        String value = StringUtils.trim(pageUrl);
        if (StringUtils.isEmpty(value) || value.length() > 2048)
        {
            throw new ServiceException("微信分享页面地址无效");
        }
        int fragmentIndex = value.indexOf('#');
        String normalized = fragmentIndex >= 0 ? value.substring(0, fragmentIndex) : value;
        try
        {
            URI page = URI.create(normalized);
            URI frontend = URI.create(properties.getFrontendReturnUrl());
            if (!"https".equalsIgnoreCase(page.getScheme()) || page.getHost() == null
                    || !sameOrigin(page, frontend))
            {
                throw new ServiceException("微信分享页面地址不在允许的站点内");
            }
            return normalized;
        }
        catch (IllegalArgumentException exception)
        {
            throw new ServiceException("微信分享页面地址无效");
        }
    }

    private boolean sameOrigin(URI left, URI right)
    {
        return left.getScheme() != null && left.getScheme().equalsIgnoreCase(right.getScheme())
                && left.getHost() != null && left.getHost().equalsIgnoreCase(right.getHost())
                && effectivePort(left) == effectivePort(right);
    }

    private int effectivePort(URI uri)
    {
        if (uri.getPort() >= 0)
        {
            return uri.getPort();
        }
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }

    private void requireConfigured()
    {
        if (StringUtils.isEmpty(StringUtils.trim(properties.getAppId()))
                || StringUtils.isEmpty(StringUtils.trim(properties.getAppSecret()))
                || StringUtils.isEmpty(StringUtils.trim(properties.getFrontendReturnUrl())))
        {
            throw new ServiceException("微信分享暂未配置");
        }
    }

    static String sign(String ticket, String nonceStr, long timestamp, String url)
    {
        String source = "jsapi_ticket=" + ticket + "&noncestr=" + nonceStr
                + "&timestamp=" + timestamp + "&url=" + url;
        try
        {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1")
                    .digest(source.getBytes(StandardCharsets.UTF_8)));
        }
        catch (GeneralSecurityException exception)
        {
            throw new IllegalStateException("当前运行环境不支持 SHA-1", exception);
        }
    }

    private String randomNonce()
    {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private CachedCredential cache(String value, long expiresInSeconds)
    {
        long ttl = Math.max(60L, expiresInSeconds - EXPIRY_SAFETY_SECONDS);
        return new CachedCredential(value, Instant.now().plusSeconds(ttl));
    }

    private boolean isValid(CachedCredential credential)
    {
        return credential != null && Instant.now().isBefore(credential.expiresAt());
    }

    private String encode(String value)
    {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record CachedCredential(String value, Instant expiresAt) {}
}
