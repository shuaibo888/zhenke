package com.ruoyi.shop.sso;

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
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;

@Service
public class EventSsoService
{
    private static final Logger log = LoggerFactory.getLogger(EventSsoService.class);
    private static final String PHONE_PATTERN = "^1\\d{10}$";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(3);

    private final EventSsoProperties properties;
    private final HttpClient httpClient;

    public EventSsoService(EventSsoProperties properties)
    {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
    }

    public EventSsoIdentity exchangeTicket(String rawTicket)
    {
        String ticket = StringUtils.trim(rawTicket);
        if (StringUtils.isEmpty(ticket) || ticket.length() > 512)
        {
            throw new ServiceException("登录票据格式错误，请重新从赛事系统进入");
        }
        if (!isConfigured())
        {
            log.error("Event SSO is not configured");
            throw new ServiceException("赛事系统单点登录尚未配置，请联系管理员");
        }

        String requestId = UUID.randomUUID().toString();
        HttpRequest request = HttpRequest.newBuilder(exchangeUri())
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + properties.getClientSecret().trim())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("X-Request-Id", requestId)
                .POST(HttpRequest.BodyPublishers.ofString(
                        JSON.toJSONString(Map.of("ticket", ticket)), StandardCharsets.UTF_8))
                .build();

        try
        {
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return parseResponse(response.statusCode(), response.body(), requestId);
        }
        catch (InterruptedException exception)
        {
            Thread.currentThread().interrupt();
            throw new ServiceException("单点登录请求已中断，请重新从赛事系统进入");
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Event SSO ticket exchange failed, requestId={}: {}", requestId, exception.getMessage());
            throw new ServiceException("赛事系统暂时无法连接，请稍后重新进入甄客行");
        }
    }

    EventSsoIdentity parseResponse(int httpStatus, String responseBody, String requestId)
    {
        JSONObject payload;
        try
        {
            payload = JSON.parseObject(responseBody);
        }
        catch (Exception exception)
        {
            log.warn("Event SSO returned invalid JSON, requestId={}, httpStatus={}", requestId, httpStatus);
            throw new ServiceException("赛事系统返回结果异常，请联系管理员");
        }

        String upstreamCode = payload == null ? null : StringUtils.trim(payload.getString("code"));
        boolean success = httpStatus >= 200 && httpStatus < 300 && "0".equals(upstreamCode);
        if (!success)
        {
            log.warn("Event SSO rejected ticket, requestId={}, httpStatus={}, code={}",
                    requestId, httpStatus, safeCode(upstreamCode));
            throw upstreamFailure(upstreamCode);
        }

        JSONObject data = payload.getJSONObject("data");
        String phone = data == null ? null : StringUtils.trim(data.getString("phone"));
        if (StringUtils.isEmpty(phone) || !phone.matches(PHONE_PATTERN))
        {
            log.warn("Event SSO returned invalid phone, requestId={}", requestId);
            throw new ServiceException("赛事系统返回的手机号格式错误，请联系管理员");
        }
        String nickname = StringUtils.trim(data.getString("username"));
        if (StringUtils.isEmpty(nickname) || nickname.length() > 30)
        {
            log.warn("Event SSO returned invalid nickname, requestId={}", requestId);
            throw new ServiceException("赛事系统返回的用户昵称格式错误，请联系管理员");
        }
        return new EventSsoIdentity(phone, nickname);
    }

    private ServiceException upstreamFailure(String code)
    {
        if ("TICKET_EXPIRED".equals(code))
        {
            return new ServiceException("登录票据已过期，请重新从赛事系统进入");
        }
        if ("TICKET_ALREADY_USED".equals(code))
        {
            return new ServiceException("登录票据已使用，请重新从赛事系统进入");
        }
        if ("TICKET_INVALID".equals(code))
        {
            return new ServiceException("登录票据无效，请重新从赛事系统进入");
        }
        if ("USER_DISABLED".equals(code))
        {
            return new ServiceException("赛事系统账号已停用");
        }
        if ("INVALID_CLIENT".equals(code))
        {
            return new ServiceException("单点登录服务认证失败，请联系管理员");
        }
        return new ServiceException("赛事系统暂时无法完成登录，请稍后重新进入甄客行");
    }

    private URI exchangeUri()
    {
        URI endpoint;
        try
        {
            endpoint = URI.create(StringUtils.trim(properties.getExchangeUrl()));
        }
        catch (Exception exception)
        {
            throw new ServiceException("赛事系统单点登录地址配置错误，请联系管理员");
        }
        if (!"https".equalsIgnoreCase(endpoint.getScheme()))
        {
            throw new ServiceException("赛事系统单点登录地址必须使用 HTTPS");
        }
        return endpoint;
    }

    private boolean isConfigured()
    {
        return !StringUtils.isEmpty(StringUtils.trim(properties.getExchangeUrl()))
                && !StringUtils.isEmpty(StringUtils.trim(properties.getClientSecret()));
    }

    private String safeCode(String code)
    {
        return StringUtils.isEmpty(code) || !code.matches("^[A-Za-z0-9_-]{1,64}$") ? "UNKNOWN" : code;
    }
}
