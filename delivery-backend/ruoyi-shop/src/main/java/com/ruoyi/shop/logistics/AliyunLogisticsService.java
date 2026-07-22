package com.ruoyi.shop.logistics;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopOrderLogisticsEvent;
import com.ruoyi.shop.domain.vo.ShopLogisticsTrace;
import com.ruoyi.shop.domain.vo.ShopLogisticsTraceEvent;

@Service
public class AliyunLogisticsService
{
    private static final Logger log = LoggerFactory.getLogger(AliyunLogisticsService.class);
    private static final DateTimeFormatter EVENT_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AliyunLogisticsProperties properties;
    private final HttpClient httpClient;

    public AliyunLogisticsService(AliyunLogisticsProperties properties)
    {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.max(1, properties.getConnectTimeoutSeconds())))
                .build();
    }

    public ShopLogisticsTrace query(String carrier, String trackingNo,
            List<ShopOrderLogisticsEvent> localEvents)
    {
        List<ShopLogisticsTraceEvent> fallback = localEvents == null
                ? new ArrayList<>() : localEvents.stream().map(this::fromLocalEvent).toList();
        if (StringUtils.isEmpty(StringUtils.trim(trackingNo)))
        {
            return new ShopLogisticsTrace(carrier, trackingNo, "PREPARING", "商家尚未登记运单号", fallback);
        }
        if (!isConfigured())
        {
            return new ShopLogisticsTrace(carrier, trackingNo, "UNKNOWN",
                    "阿里云物流查询尚未启用，请联系平台管理员完成配置", fallback);
        }

        try
        {
            URI endpoint = buildEndpoint(trackingNo);
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(Math.max(1, properties.getRequestTimeoutSeconds())))
                    .header("Authorization", "APPCODE " + properties.getAppCode().trim())
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300)
            {
                return fallback(carrier, trackingNo, fallback, "阿里云物流服务暂时不可用（HTTP " + response.statusCode() + "）");
            }
            return parseResponse(carrier, trackingNo, response.body(), fallback);
        }
        catch (InterruptedException ex)
        {
            Thread.currentThread().interrupt();
            return fallback(carrier, trackingNo, fallback, "物流查询已中断，请稍后重试");
        }
        catch (Exception ex)
        {
            log.warn("Aliyun logistics query failed for trackingNo={}: {}", maskTrackingNo(trackingNo), ex.getMessage());
            return fallback(carrier, trackingNo, fallback, "阿里云物流查询失败，请稍后重试");
        }
    }

    private ShopLogisticsTrace parseResponse(String carrier, String trackingNo, String body,
            List<ShopLogisticsTraceEvent> fallback)
    {
        JSONObject payload = JSON.parseObject(body);
        JSONObject result = payload == null ? null : payload.getJSONObject("result");
        String providerMessage = firstNonBlank(payload == null ? null : payload.getString("msg"),
                payload == null ? null : payload.getString("message"));
        if (result == null)
        {
            return fallback(carrier, trackingNo, fallback,
                    StringUtils.isEmpty(providerMessage) ? "阿里云物流暂未返回轨迹" : providerMessage);
        }

        String resolvedCarrier = firstNonBlank(result.getString("expName"), result.getString("type"), carrier);
        JSONArray rows = firstArray(result, "list", "data", "traces");
        List<ShopLogisticsTraceEvent> providerEvents = new ArrayList<>();
        if (rows != null)
        {
            for (int index = 0; index < rows.size(); index++)
            {
                JSONObject row = rows.getJSONObject(index);
                if (row == null) continue;
                String description = firstNonBlank(row.getString("status"), row.getString("context"),
                        row.getString("AcceptStation"), row.getString("description"));
                if (StringUtils.isEmpty(description)) continue;
                String eventTime = firstNonBlank(row.getString("time"), row.getString("ftime"),
                        row.getString("AcceptTime"), row.getString("eventTime"));
                String location = firstNonBlank(row.getString("location"), row.getString("areaName"));
                providerEvents.add(new ShopLogisticsTraceEvent("PROVIDER_TRACE", description, location,
                        eventTime, "PROVIDER", trackingNo + ":" + index));
            }
        }

        List<ShopLogisticsTraceEvent> merged = mergeEvents(providerEvents, fallback);
        String state = resolveState(result, providerEvents);
        String message = providerEvents.isEmpty()
                ? firstNonBlank(providerMessage, "承运商已接单，暂未返回物流轨迹") : null;
        return new ShopLogisticsTrace(resolvedCarrier, trackingNo, state, message, merged);
    }

    private List<ShopLogisticsTraceEvent> mergeEvents(List<ShopLogisticsTraceEvent> provider,
            List<ShopLogisticsTraceEvent> fallback)
    {
        Map<String, ShopLogisticsTraceEvent> unique = new LinkedHashMap<>();
        for (ShopLogisticsTraceEvent event : provider)
        {
            unique.put(event.eventTime() + "|" + event.description(), event);
        }
        for (ShopLogisticsTraceEvent event : fallback)
        {
            unique.putIfAbsent(event.eventTime() + "|" + event.description(), event);
        }
        return unique.values().stream()
                .sorted(Comparator.comparing((ShopLogisticsTraceEvent event) ->
                        StringUtils.isEmpty(event.eventTime()) ? "" : event.eventTime()).reversed())
                .toList();
    }

    private String resolveState(JSONObject result, List<ShopLogisticsTraceEvent> events)
    {
        String signed = firstNonBlank(result.getString("issign"), result.getString("isSign"));
        String deliveryStatus = firstNonBlank(result.getString("deliverystatus"), result.getString("deliveryStatus"));
        if ("1".equals(signed) || "3".equals(deliveryStatus)) return "DELIVERED";
        if ("4".equals(deliveryStatus)) return "EXCEPTION";
        return events.isEmpty() ? "UNKNOWN" : "IN_TRANSIT";
    }

    private URI buildEndpoint(String trackingNo)
    {
        URI configured = URI.create(properties.getEndpoint().trim());
        if (!"https".equalsIgnoreCase(configured.getScheme()))
        {
            throw new IllegalStateException("阿里云物流 endpoint 必须使用 HTTPS");
        }
        String separator = properties.getEndpoint().contains("?") ? "&" : "?";
        StringBuilder url = new StringBuilder(properties.getEndpoint())
                .append(separator).append("no=").append(urlEncode(trackingNo));
        return URI.create(url.toString());
    }

    private boolean isConfigured()
    {
        return properties.isEnabled()
                && !StringUtils.isEmpty(StringUtils.trim(properties.getEndpoint()))
                && !StringUtils.isEmpty(StringUtils.trim(properties.getAppCode()));
    }

    private ShopLogisticsTrace fallback(String carrier, String trackingNo,
            List<ShopLogisticsTraceEvent> events, String message)
    {
        return new ShopLogisticsTrace(carrier, trackingNo, events.isEmpty() ? "UNKNOWN" : "IN_TRANSIT", message, events);
    }

    private ShopLogisticsTraceEvent fromLocalEvent(ShopOrderLogisticsEvent event)
    {
        String eventTime = event.getEventTime() == null ? null
                : EVENT_TIME.format(event.getEventTime().toInstant().atZone(ZoneId.systemDefault()));
        return new ShopLogisticsTraceEvent(event.getEventCode(), event.getDescription(), event.getLocation(),
                eventTime, event.getSource(), event.getSourceEventId());
    }

    private JSONArray firstArray(JSONObject object, String... keys)
    {
        for (String key : keys)
        {
            JSONArray value = object.getJSONArray(key);
            if (value != null) return value;
        }
        return null;
    }

    private String firstNonBlank(String... values)
    {
        for (String value : values)
        {
            if (!StringUtils.isEmpty(StringUtils.trim(value))) return value.trim();
        }
        return null;
    }

    private String maskTrackingNo(String trackingNo)
    {
        if (trackingNo == null || trackingNo.length() <= 6) return "***";
        return trackingNo.substring(0, 3) + "***" + trackingNo.substring(trackingNo.length() - 3);
    }

    private String urlEncode(String value)
    {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
