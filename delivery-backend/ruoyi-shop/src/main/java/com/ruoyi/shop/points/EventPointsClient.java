package com.ruoyi.shop.points;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.ruoyi.common.utils.StringUtils;

/**
 * 赛事系统积分接口客户端。
 * <p>
 * 与 SSO 服务端调用保持一致：HTTPS、Bearer 服务端密钥、短超时、脱敏日志、X-Request-Id。
 * 明确业务错误码（结果确定）与超时/5xx/解析失败（结果不确定）通过 {@link EventPointsException} 区分。
 */
@Service
public class EventPointsClient
{
    private static final Logger log = LoggerFactory.getLogger(EventPointsClient.class);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(3);

    private final EventPointsProperties properties;
    private final HttpClient httpClient;

    public EventPointsClient(EventPointsProperties properties)
    {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
    }

    public EventPointsBalance queryBalance(String phone)
    {
        String requestId = UUID.randomUUID().toString();
        JSONObject payload = post(properties.getBalanceUrl(),
                Map.of("phone", phone), requestId, "balance");
        JSONObject data = payload.getJSONObject("data");
        Long availablePoints = data == null ? null : data.getLong("availablePoints");
        if (availablePoints == null || availablePoints < 0)
        {
            log.warn("Event points balance returned invalid value, requestId={}", requestId);
            throw new EventPointsException(null, null, "赛事系统返回的可划拨积分异常");
        }
        return new EventPointsBalance(availablePoints);
    }

    public EventPointsTransferResult transfer(String requestNo, String phone, long points)
    {
        String requestId = UUID.randomUUID().toString();
        JSONObject payload = post(properties.getTransferUrl(),
                Map.of("requestNo", requestNo, "phone", phone, "points", points), requestId, "transfer");
        return parseTransferResult(payload, requestNo, points, requestId);
    }

    EventPointsTransferResult parseTransferResult(JSONObject payload, String requestNo, long points,
            String requestId)
    {
        JSONObject data = payload.getJSONObject("data");
        String responseRequestNo = data == null ? null : StringUtils.trim(data.getString("requestNo"));
        String transferNo = data == null ? null : StringUtils.trim(data.getString("transferNo"));
        Long pointsOut = data == null ? null : data.getLong("points");
        Long remainingPoints = data == null ? null : data.getLong("remainingPoints");
        if (!requestNo.equals(responseRequestNo)
                || StringUtils.isEmpty(transferNo) || transferNo.length() > 64
                || pointsOut == null || pointsOut != points
                || remainingPoints == null || remainingPoints < 0)
        {
            log.warn("Event points transfer returned invalid result, requestId={}", requestId);
            throw new EventPointsException(null, null, "赛事系统划拨返回结果异常，请稍后重试");
        }
        return new EventPointsTransferResult(responseRequestNo, transferNo, pointsOut, remainingPoints);
    }

    private JSONObject post(String url, Map<String, Object> body, String requestId, String action)
    {
        if (!isConfigured())
        {
            log.error("Event points {} is not configured", action);
            throw new EventPointsException("NOT_CONFIGURED", null, "积分划拨服务尚未配置，请联系管理员");
        }
        URI endpoint;
        try
        {
            endpoint = URI.create(StringUtils.trim(url));
        }
        catch (Exception exception)
        {
            throw new EventPointsException("NOT_CONFIGURED", null, "积分划拨服务地址配置错误，请联系管理员");
        }
        if (!"https".equalsIgnoreCase(endpoint.getScheme()))
        {
            throw new EventPointsException("NOT_CONFIGURED", null, "积分划拨服务地址必须使用 HTTPS");
        }

        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + properties.getClientSecret().trim())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("X-Request-Id", requestId)
                .POST(HttpRequest.BodyPublishers.ofString(
                        JSON.toJSONString(body), StandardCharsets.UTF_8))
                .build();

        try
        {
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return parseResponse(response.statusCode(), response.body(), requestId, action);
        }
        catch (InterruptedException exception)
        {
            Thread.currentThread().interrupt();
            throw new EventPointsException(null, null, "积分划拨请求已中断，请重试");
        }
        catch (EventPointsException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Event points {} failed, requestId={}: {}", action, requestId, exception.getMessage());
            throw new EventPointsException(null, null, "赛事系统暂时无法连接，请稍后重试");
        }
    }

    JSONObject parseResponse(int httpStatus, String responseBody, String requestId, String action)
    {
        JSONObject payload;
        try
        {
            payload = JSON.parseObject(responseBody);
        }
        catch (Exception exception)
        {
            log.warn("Event points {} returned invalid JSON, requestId={}, httpStatus={}", action, requestId, httpStatus);
            throw new EventPointsException(null, null, "赛事系统返回结果异常，请稍后重试");
        }

        String upstreamCode = payload == null ? null : StringUtils.trim(payload.getString("code"));
        boolean success = httpStatus >= 200 && httpStatus < 300 && "0".equals(upstreamCode);
        if (success)
        {
            return payload;
        }

        String safeCode = safeCode(upstreamCode);
        // 赛事系统明确返回的非成功业务码直接终结订单，不把未来新增的错误码误判成待确认。
        // 5xx 仍表示调用结果不确定：赛事系统可能已完成扣减，但响应未能正常返回。
        if (httpStatus < 500 && !"0".equals(upstreamCode) && isSafeCode(upstreamCode))
        {
            Long availablePoints = extractAvailablePoints(payload);
            log.warn("Event points {} rejected definitively, requestId={}, code={}",
                    action, requestId, safeCode);
            throw new EventPointsException(upstreamCode, availablePoints,
                    "赛事系统拒绝积分" + ("balance".equals(action) ? "查询" : "划拨") + ": " + safeCode);
        }
        log.warn("Event points {} outcome uncertain, requestId={}, httpStatus={}, code={}",
                action, requestId, httpStatus, safeCode);
        throw new EventPointsException(null, null, "赛事系统暂时无法连接，请稍后重试");
    }

    private Long extractAvailablePoints(JSONObject payload)
    {
        JSONObject data = payload == null ? null : payload.getJSONObject("data");
        if (data == null) return null;
        Long availablePoints = data.getLong("availablePoints");
        return availablePoints == null || availablePoints < 0 ? null : availablePoints;
    }

    private boolean isConfigured()
    {
        return !StringUtils.isEmpty(StringUtils.trim(properties.getBalanceUrl()))
                && !StringUtils.isEmpty(StringUtils.trim(properties.getTransferUrl()))
                && !StringUtils.isEmpty(StringUtils.trim(properties.getClientSecret()));
    }

    private String safeCode(String code)
    {
        return isSafeCode(code) ? code : "UNKNOWN";
    }

    private boolean isSafeCode(String code)
    {
        return !StringUtils.isEmpty(code) && code.matches("^[A-Za-z0-9_-]{1,64}$");
    }
}
