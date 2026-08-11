package com.ruoyi.shop.phone;

import java.net.URI;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.aliyun.dypnsapi20170525.Client;
import com.aliyun.dypnsapi20170525.models.CheckSmsVerifyCodeRequest;
import com.aliyun.dypnsapi20170525.models.CheckSmsVerifyCodeResponse;
import com.aliyun.dypnsapi20170525.models.GetAuthTokenRequest;
import com.aliyun.dypnsapi20170525.models.GetAuthTokenResponse;
import com.aliyun.dypnsapi20170525.models.GetPhoneWithTokenRequest;
import com.aliyun.dypnsapi20170525.models.GetPhoneWithTokenResponse;
import com.aliyun.dypnsapi20170525.models.SendSmsVerifyCodeRequest;
import com.aliyun.dypnsapi20170525.models.SendSmsVerifyCodeResponse;
import com.aliyun.teaopenapi.models.Config;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.config.AliyunAccessKeyProperties;

@Service
public class AliyunPhoneAuthService
{
    private static final Logger log = LoggerFactory.getLogger(AliyunPhoneAuthService.class);
    private static final String SMS_STATE_PREFIX = "shop:phone-auth:sms:state:";
    private static final String SMS_COOLDOWN_PREFIX = "shop:phone-auth:sms:cooldown:";
    private static final String ENDPOINT = "dypnsapi.aliyuncs.com";
    private static final String H5_SDK_URL = "/vendor/aliyun-number-auth/numberAuth-web-sdk.js";
    private static final int SMS_VALID_SECONDS = 300;
    private static final int SMS_SEND_INTERVAL_SECONDS = 60;

    private final AliyunPhoneAuthProperties properties;
    private final AliyunAccessKeyProperties accessKeyProperties;
    private final RedisCache redisCache;

    public AliyunPhoneAuthService(AliyunPhoneAuthProperties properties,
            AliyunAccessKeyProperties accessKeyProperties, RedisCache redisCache)
    {
        this.properties = properties;
        this.accessKeyProperties = accessKeyProperties;
        this.redisCache = redisCache;
    }

    public PhoneAuthCapabilities capabilities()
    {
        return new PhoneAuthCapabilities(isSmsConfigured(), isH5Configured(), H5_SDK_URL);
    }

    public void sendCode(String rawPhone, PhoneVerificationScene scene)
    {
        String phone = normalizePhone(rawPhone);
        requireSmsConfigured();
        String cooldownKey = SMS_COOLDOWN_PREFIX + phone;
        if (Boolean.TRUE.equals(redisCache.hasKey(cooldownKey)))
        {
            throw new ServiceException("验证码发送过于频繁，请稍后再试");
        }

        String outId = UUID.randomUUID().toString().replace("-", "");
        AliyunPhoneAuthProperties.Sms sms = properties.getSms();
        try
        {
            SendSmsVerifyCodeRequest request = new SendSmsVerifyCodeRequest()
                    .setPhoneNumber(phone)
                    .setCountryCode("86")
                    .setSignName(sms.getSignName())
                    .setTemplateCode(templateCode(scene))
                    .setTemplateParam("{\"code\":\"##code##\",\"min\":\"5\"}")
                    .setCodeType(1L)
                    .setCodeLength(6L)
                    .setValidTime((long) SMS_VALID_SECONDS)
                    .setInterval((long) SMS_SEND_INTERVAL_SECONDS)
                    .setDuplicatePolicy(1L)
                    .setReturnVerifyCode(false)
                    .setOutId(outId);
            SendSmsVerifyCodeResponse response = client().sendSmsVerifyCode(request);
            if (response == null || response.getBody() == null
                    || !Boolean.TRUE.equals(response.getBody().getSuccess())
                    || !"OK".equalsIgnoreCase(response.getBody().getCode()))
            {
                String requestId = response == null || response.getBody() == null ? null : response.getBody().getRequestId();
                log.warn("Aliyun phone SMS send rejected: scene={}, requestId={}", scene, requestId);
                throw new ServiceException("短信验证码发送失败，请稍后重试");
            }
            redisCache.setCacheObject(stateKey(scene, phone), outId, SMS_VALID_SECONDS, TimeUnit.SECONDS);
            redisCache.setCacheObject(cooldownKey, "1", SMS_SEND_INTERVAL_SECONDS, TimeUnit.SECONDS);
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Aliyun phone SMS send error: scene={}", scene, exception);
            throw new ServiceException("短信验证码服务暂时不可用，请稍后重试");
        }
    }

    public void verifyCode(String rawPhone, String rawCode, PhoneVerificationScene scene)
    {
        String phone = normalizePhone(rawPhone);
        String code = rawCode == null ? "" : rawCode.trim();
        if (!code.matches("^\\d{4,8}$"))
        {
            throw new ServiceException("短信验证码格式错误");
        }
        requireSmsConfigured();
        String key = stateKey(scene, phone);
        String outId = redisCache.getCacheObject(key);
        if (StringUtils.isEmpty(outId))
        {
            throw new ServiceException("验证码已过期，请重新获取");
        }

        try
        {
            CheckSmsVerifyCodeRequest request = new CheckSmsVerifyCodeRequest()
                    .setPhoneNumber(phone)
                    .setCountryCode("86")
                    .setVerifyCode(code)
                    .setCaseAuthPolicy(2L)
                    .setOutId(outId);
            CheckSmsVerifyCodeResponse response = client().checkSmsVerifyCode(request);
            boolean passed = response != null && response.getBody() != null
                    && Boolean.TRUE.equals(response.getBody().getSuccess())
                    && "OK".equalsIgnoreCase(response.getBody().getCode())
                    && response.getBody().getModel() != null
                    && "PASS".equalsIgnoreCase(response.getBody().getModel().getVerifyResult())
                    && outId.equals(response.getBody().getModel().getOutId());
            if (!passed)
            {
                throw new ServiceException("短信验证码错误或已失效");
            }
            redisCache.deleteObject(key);
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Aliyun phone SMS verify error: scene={}", scene, exception);
            throw new ServiceException("短信验证码核验失败，请稍后重试");
        }
    }

    public H5AuthTokens getH5AuthTokens()
    {
        requireH5Configured();
        try
        {
            AliyunPhoneAuthProperties.H5 h5 = properties.getH5();
            GetAuthTokenRequest request = new GetAuthTokenRequest()
                    .setUrl(h5.getPageUrl())
                    .setOrigin(originOf(h5.getPageUrl()))
                    .setSceneCode(h5.getSceneCode())
                    .setBizType(1);
            GetAuthTokenResponse response = client().getAuthToken(request);
            if (response == null || response.getBody() == null || response.getBody().getTokenInfo() == null
                    || !"OK".equalsIgnoreCase(response.getBody().getCode()))
            {
                String code = response == null || response.getBody() == null ? null : response.getBody().getCode();
                String message = response == null || response.getBody() == null ? null : response.getBody().getMessage();
                String requestId = response == null || response.getBody() == null ? null : response.getBody().getRequestId();
                log.warn("Aliyun H5 auth token rejected: code={}, message={}, requestId={}", code, message, requestId);
                throw new ServiceException("一键认证初始化失败，请使用短信验证码");
            }
            return new H5AuthTokens(response.getBody().getTokenInfo().getAccessToken(),
                    response.getBody().getTokenInfo().getJwtToken());
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Aliyun H5 auth token error", exception);
            throw new ServiceException("一键认证暂时不可用，请使用短信验证码");
        }
    }

    public String getPhoneByOneClickToken(String spToken)
    {
        requireH5Configured();
        if (StringUtils.isEmpty(spToken) || spToken.length() > 32768)
        {
            throw new ServiceException("一键认证凭证格式错误");
        }
        try
        {
            GetPhoneWithTokenResponse response = client().getPhoneWithToken(
                    new GetPhoneWithTokenRequest().setSpToken(spToken));
            if (response == null || response.getBody() == null || response.getBody().getData() == null
                    || !"OK".equalsIgnoreCase(response.getBody().getCode()))
            {
                throw new ServiceException("一键认证失败，请使用短信验证码");
            }
            return normalizePhone(String.valueOf(response.getBody().getData().getMobile()));
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Aliyun H5 phone exchange error", exception);
            throw new ServiceException("一键认证暂时不可用，请使用短信验证码");
        }
    }

    public String normalizePhone(String rawPhone)
    {
        String phone = rawPhone == null ? "" : rawPhone.trim();
        if (!phone.matches("^1\\d{10}$"))
        {
            throw new ServiceException("请输入11位中国大陆手机号");
        }
        return phone;
    }

    private Client client() throws Exception
    {
        Config config = new Config()
                .setAccessKeyId(accessKeyProperties.getAccessKeyId().trim())
                .setAccessKeySecret(accessKeyProperties.getAccessKeySecret().trim())
                .setEndpoint(ENDPOINT);
        return new Client(config);
    }

    private String templateCode(PhoneVerificationScene scene)
    {
        return switch (scene)
        {
            case LOGIN_REGISTER -> "100001";
            case CHANGE_PHONE -> "100002";
            case RESET_PASSWORD -> "100003";
            case BIND_PHONE -> "100004";
        };
    }

    private String stateKey(PhoneVerificationScene scene, String phone)
    {
        return SMS_STATE_PREFIX + scene.name() + ":" + phone;
    }

    private boolean isSmsConfigured()
    {
        AliyunPhoneAuthProperties.Sms sms = properties.getSms();
        return baseConfigured() && !StringUtils.isEmpty(sms.getSignName());
    }

    private boolean isH5Configured()
    {
        AliyunPhoneAuthProperties.H5 h5 = properties.getH5();
        return baseConfigured() && !StringUtils.isEmpty(h5.getSceneCode())
                && !StringUtils.isEmpty(h5.getPageUrl());
    }

    private boolean baseConfigured()
    {
        return properties.isEnabled()
                && !StringUtils.isEmpty(StringUtils.trim(accessKeyProperties.getAccessKeyId()))
                && !StringUtils.isEmpty(StringUtils.trim(accessKeyProperties.getAccessKeySecret()));
    }

    private void requireSmsConfigured()
    {
        if (!isSmsConfigured()) throw new ServiceException("短信验证码服务尚未配置");
    }

    private void requireH5Configured()
    {
        if (!isH5Configured()) throw new ServiceException("H5一键认证服务尚未配置");
    }

    private String originOf(String pageUrl)
    {
        try
        {
            URI uri = URI.create(pageUrl);
            if (uri.getScheme() == null || uri.getRawAuthority() == null)
            {
                throw new IllegalArgumentException("missing origin");
            }
            return uri.getScheme() + "://" + uri.getRawAuthority();
        }
        catch (IllegalArgumentException exception)
        {
            throw new ServiceException("H5一键认证页面地址配置错误");
        }
    }

    public record PhoneAuthCapabilities(boolean smsEnabled, boolean oneClickEnabled, String sdkUrl) { }
    public record H5AuthTokens(String accessToken, String jwtToken) { }
}
