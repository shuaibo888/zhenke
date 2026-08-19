package com.ruoyi.shop.map;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.vo.ShopMerchantPublicView;

@Service
public class TencentMapService
{
    private static final Logger log = LoggerFactory.getLogger(TencentMapService.class);
    private static final String GEOCODER_URL = "https://apis.map.qq.com/ws/geocoder/v1/";
    private static final String URI_API_URL = "https://apis.map.qq.com/uri/v1/";

    private final TencentMapProperties properties;
    private final HttpClient httpClient;

    public TencentMapService(TencentMapProperties properties)
    {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.max(1, properties.getConnectTimeoutSeconds())))
                .build();
    }

    public TencentMapLocation geocode(String address)
    {
        String normalizedAddress = StringUtils.trim(address);
        String key = StringUtils.trim(properties.getKey());
        if (!properties.isEnabled() || StringUtils.isEmpty(key))
        {
            throw new ServiceException("腾讯地图地址解析服务尚未配置，请联系平台管理员");
        }
        if (StringUtils.isEmpty(normalizedAddress))
        {
            throw new ServiceException("营业执照未识别出有效地址，请重新上传清晰图片");
        }

        String query = "address=" + encode(normalizedAddress) + "&key=" + encode(key);
        HttpRequest request = HttpRequest.newBuilder(URI.create(GEOCODER_URL + "?" + query))
                .timeout(Duration.ofSeconds(Math.max(1, properties.getRequestTimeoutSeconds())))
                .header("Accept", "application/json")
                .GET()
                .build();
        try
        {
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300)
            {
                log.warn("Tencent map geocoder returned HTTP status {}", response.statusCode());
                throw new ServiceException("店铺地址定位失败，请稍后重新提交");
            }
            return parseLocation(response.body());
        }
        catch (InterruptedException exception)
        {
            Thread.currentThread().interrupt();
            throw new ServiceException("店铺地址定位请求已中断，请重新提交");
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Tencent map geocoder request failed: {}", exception.getMessage());
            throw new ServiceException("店铺地址定位失败，请稍后重新提交");
        }
    }

    TencentMapLocation parseLocation(String responseBody)
    {
        try
        {
            JSONObject payload = JSON.parseObject(responseBody);
            Integer status = payload == null ? null : payload.getInteger("status");
            JSONObject result = payload == null ? null : payload.getJSONObject("result");
            JSONObject location = result == null ? null : result.getJSONObject("location");
            BigDecimal latitude = location == null ? null : location.getBigDecimal("lat");
            BigDecimal longitude = location == null ? null : location.getBigDecimal("lng");
            if (status == null || status != 0 || latitude == null || longitude == null
                    || latitude.compareTo(BigDecimal.valueOf(-90)) < 0
                    || latitude.compareTo(BigDecimal.valueOf(90)) > 0
                    || longitude.compareTo(BigDecimal.valueOf(-180)) < 0
                    || longitude.compareTo(BigDecimal.valueOf(180)) > 0)
            {
                String providerMessage = payload == null ? null : payload.getString("message");
                log.warn("Tencent map geocoder rejected address, status={}, message={}", status,
                        safeProviderMessage(providerMessage));
                throw new ServiceException("营业执照地址无法准确定位，请核对执照图片后重试");
            }
            return new TencentMapLocation(
                    latitude.setScale(6, RoundingMode.HALF_UP),
                    longitude.setScale(6, RoundingMode.HALF_UP));
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Tencent map geocoder returned invalid JSON");
            throw new ServiceException("店铺地址定位结果异常，请稍后重新提交");
        }
    }

    public URI navigationUri(ShopMerchantPublicView merchant)
    {
        String key = StringUtils.trim(properties.getKey());
        if (!properties.isEnabled() || StringUtils.isEmpty(key))
        {
            throw new ServiceException("腾讯地图导航服务尚未配置");
        }

        String shopName = StringUtils.trim(merchant.getShopName());
        String storeAddress = StringUtils.trim(merchant.getStoreAddress());
        if (StringUtils.isEmpty(shopName) || StringUtils.isEmpty(storeAddress)
                || merchant.getLatitude() == null || merchant.getLongitude() == null)
        {
            throw new ServiceException("该商家导航信息不完整");
        }
        String marker = "coord:" + merchant.getLatitude().toPlainString() + ","
                + merchant.getLongitude().toPlainString()
                + ";title:" + shopName
                + ";addr:" + storeAddress;
        String query = "marker=" + encode(marker)
                + "&referer=" + encode(key);
        return URI.create(URI_API_URL + "marker?" + query);
    }

    private String encode(String value)
    {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String safeProviderMessage(String value)
    {
        String message = StringUtils.trim(value);
        if (StringUtils.isEmpty(message)) return "-";
        return message.length() > 120 ? message.substring(0, 120) : message;
    }
}
