package com.ruoyi.shop.phone;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.aliyun.dypnsapi20170525.Client;
import com.aliyun.dypnsapi20170525.models.GetAuthTokenRequest;
import com.aliyun.dypnsapi20170525.models.GetAuthTokenResponse;
import com.aliyun.dypnsapi20170525.models.GetPhoneWithTokenRequest;
import com.aliyun.dypnsapi20170525.models.GetPhoneWithTokenResponse;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
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
    private static final String SMS_ATTEMPTS_PREFIX = "shop:phone-auth:sms:attempts:";
    private static final String SMS_COOLDOWN_PREFIX = "shop:phone-auth:sms:cooldown:";
    private static final String PHONE_AUTH_ENDPOINT = "dypnsapi.aliyuncs.com";
    private static final String SMS_ENDPOINT = "dysmsapi.aliyuncs.com";
    private static final String H5_SDK_URL = "/vendor/aliyun-number-auth/numberAuth-web-sdk.js";
    private static final int SMS_VALID_SECONDS = 300;
    private static final int SMS_SEND_INTERVAL_SECONDS = 60;
    private static final int SMS_MAX_VERIFY_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

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

        AliyunPhoneAuthProperties.Sms sms = properties.getSms();
        String code = generateVerificationCode();
        String nonce = UUID.randomUUID().toString().replace("-", "");
        try
        {
            SendSmsRequest request = new SendSmsRequest()
                    .setPhoneNumbers(phone)
                    .setSignName(sms.getSignName().trim())
                    .setTemplateCode(sms.getTemplateCode().trim())
                    .setTemplateParam("{\"code\":\"" + code + "\"}")
                    .setOutId(nonce);
            SendSmsResponse response = smsClient().sendSms(request);
            if (response == null || response.getBody() == null
                    || !"OK".equalsIgnoreCase(response.getBody().getCode()))
            {
                String providerCode = response == null || response.getBody() == null ? null : response.getBody().getCode();
                String message = response == null || response.getBody() == null ? null : response.getBody().getMessage();
                String requestId = response == null || response.getBody() == null
                        ? null : response.getBody().getRequestId();
                log.warn("Aliyun custom SMS send rejected: scene={}, code={}, message={}, requestId={}",
                        scene, providerCode, message, requestId);
                throw new ServiceException("短信验证码发送失败，请稍后重试");
            }
            redisCache.setCacheObject(stateKey(scene, phone), encodeVerificationCode(nonce, code),
                    SMS_VALID_SECONDS, TimeUnit.SECONDS);
            redisCache.deleteObject(attemptsKey(scene, phone));
            redisCache.setCacheObject(cooldownKey, "1", SMS_SEND_INTERVAL_SECONDS, TimeUnit.SECONDS);
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            log.warn("Aliyun custom SMS send error: scene={}", scene, exception);
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
        String encodedCode = redisCache.getCacheObject(key);
        if (StringUtils.isEmpty(encodedCode))
        {
            throw new ServiceException("验证码已过期，请重新获取");
        }

        if (!matchesVerificationCode(encodedCode, code))
        {
            recordFailedAttempt(scene, phone, key);
            throw new ServiceException("短信验证码错误或已失效");
        }
        redisCache.deleteObject(key);
        redisCache.deleteObject(attemptsKey(scene, phone));
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
            GetAuthTokenResponse response = phoneAuthClient().getAuthToken(request);
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
            GetPhoneWithTokenResponse response = phoneAuthClient().getPhoneWithToken(
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

    private Client phoneAuthClient() throws Exception
    {
        Config config = new Config()
                .setAccessKeyId(accessKeyProperties.getAccessKeyId().trim())
                .setAccessKeySecret(accessKeyProperties.getAccessKeySecret().trim())
                .setEndpoint(PHONE_AUTH_ENDPOINT);
        return new Client(config);
    }

    private com.aliyun.dysmsapi20170525.Client smsClient() throws Exception
    {
        Config config = new Config()
                .setAccessKeyId(accessKeyProperties.getAccessKeyId().trim())
                .setAccessKeySecret(accessKeyProperties.getAccessKeySecret().trim())
                .setEndpoint(SMS_ENDPOINT);
        return new com.aliyun.dysmsapi20170525.Client(config);
    }

    private String stateKey(PhoneVerificationScene scene, String phone)
    {
        return SMS_STATE_PREFIX + scene.name() + ":" + phone;
    }

    private String attemptsKey(PhoneVerificationScene scene, String phone)
    {
        return SMS_ATTEMPTS_PREFIX + scene.name() + ":" + phone;
    }

    private void recordFailedAttempt(PhoneVerificationScene scene, String phone, String stateKey)
    {
        String attemptsKey = attemptsKey(scene, phone);
        Long attempts = redisCache.redisTemplate.opsForValue().increment(attemptsKey);
        if (attempts != null && attempts == 1L)
        {
            redisCache.expire(attemptsKey, SMS_VALID_SECONDS, TimeUnit.SECONDS);
        }
        if (attempts != null && attempts >= SMS_MAX_VERIFY_ATTEMPTS)
        {
            redisCache.deleteObject(stateKey);
            redisCache.deleteObject(attemptsKey);
        }
    }

    static String generateVerificationCode()
    {
        return String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
    }

    static String encodeVerificationCode(String nonce, String code)
    {
        return nonce + ":" + sha256(nonce + ":" + code);
    }

    static boolean matchesVerificationCode(String encodedCode, String code)
    {
        if (StringUtils.isEmpty(encodedCode) || StringUtils.isEmpty(code)) return false;
        int separator = encodedCode.indexOf(':');
        if (separator <= 0 || separator == encodedCode.length() - 1) return false;
        String nonce = encodedCode.substring(0, separator);
        String expected = encodedCode.substring(separator + 1);
        String actual = sha256(nonce + ":" + code);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256(String value)
    {
        try
        {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        }
        catch (NoSuchAlgorithmException exception)
        {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private boolean isSmsConfigured()
    {
        AliyunPhoneAuthProperties.Sms sms = properties.getSms();
        return baseConfigured()
                && !StringUtils.isEmpty(StringUtils.trim(sms.getSignName()))
                && !StringUtils.isEmpty(StringUtils.trim(sms.getTemplateCode()));
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
