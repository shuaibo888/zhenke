package com.ruoyi.shop.qualification;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.aliyun.ocr_api20210707.Client;
import com.aliyun.ocr_api20210707.models.RecognizeBusinessLicenseRequest;
import com.aliyun.ocr_api20210707.models.RecognizeBusinessLicenseResponse;
import com.aliyun.ocr_api20210707.models.VerifyBusinessLicenseRequest;
import com.aliyun.ocr_api20210707.models.VerifyBusinessLicenseResponse;
import com.aliyun.tea.TeaException;
import com.aliyun.teaopenapi.models.Config;
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;

/**
 * 商家入驻营业执照识别 + 三要素核验。
 *
 * 流程分两步：上传时先识别（RecognizeBusinessLicense）把企业字段回填表单，
 * 用户核对后用表单三要素调核验（VerifyBusinessLicense）。识别与核验结果写入 Redis，
 * 提交申请时要求存在已通过的核验记录，信用代码以服务端识别结果为准防止换主体伪造。
 */
@Service
public class AliyunLicenseService
{
    private static final Logger log = LoggerFactory.getLogger(AliyunLicenseService.class);
    private static final String CACHE_PREFIX = "merchant:license:";
    private static final String RATE_PREFIX = CACHE_PREFIX + "rate:";
    private static final String LICENSE_PATH_PATTERN = "^/profile/upload/merchant-license/"
            + "\\d{4}/\\d{2}/\\d{2}/[A-Za-z0-9_-]+\\.(?i:jpg|jpeg|png)$";

    private final AliyunLicenseProperties properties;
    private final RedisCache redisCache;

    public AliyunLicenseService(AliyunLicenseProperties properties, RedisCache redisCache)
    {
        this.properties = properties;
        this.redisCache = redisCache;
    }

    /**
     * 识别营业执照图片中的企业字段。上传流程调用，永不抛业务异常，识别失败时返回 recognized=false + 原因。
     */
    public LicenseVerifyResult recognize(String resourcePath)
    {
        LicenseVerifyResult result = new LicenseVerifyResult();
        result.setRecognized(false);
        try
        {
            Path file = resolveResourcePath(resourcePath);
            if (!isConfigured())
            {
                result.setVerifyMessage("营业执照识别服务未启用，请联系平台管理员");
                return result;
            }
            Client client = buildClient();
            RecognizeBusinessLicenseRequest request = new RecognizeBusinessLicenseRequest();
            try (InputStream input = Files.newInputStream(file))
            {
                request.setBody(input);
                RecognizeBusinessLicenseResponse response = client.recognizeBusinessLicense(request);
                applyRecognized(result, response.getBody() == null ? null : response.getBody().getData());
            }
            if (result.isRecognized())
            {
                storeRecord(resourcePath, result);
            }
            return result;
        }
        catch (ServiceException exception)
        {
            result.setVerifyMessage(exception.getMessage());
            return result;
        }
        catch (TeaException exception)
        {
            log.warn("Aliyun license recognize failed for {}: {}", resourcePath, exception.getMessage());
            result.setVerifyMessage("营业执照识别服务暂时不可用，请稍后重试");
            return result;
        }
        catch (Exception exception)
        {
            log.warn("Aliyun license recognize error for {}", resourcePath, exception);
            result.setVerifyMessage("营业执照识别失败，请重新上传清晰图片");
            return result;
        }
    }

    /**
     * 用表单三要素提交核验。信用代码必须与 OCR 识别结果一致，防止用他人执照核验别家主体。
     * 核验不通过不抛异常，通过 verified=false + 原因返回。
     */
    public LicenseVerifyResult verify(String resourcePath, String creditCode, String companyName, String legalPerson)
    {
        LicenseVerifyResult result = requireRecognized(resourcePath);
        if (!isConfigured())
        {
            throw new ServiceException("营业执照核验服务未启用，请联系平台管理员");
        }

        String submittedCode = normalize(creditCode);
        if (!submittedCode.equalsIgnoreCase(result.getCreditCode()))
        {
            throw new ServiceException("统一社会信用代码与营业执照识别结果不一致，请核对或重新上传");
        }
        if (StringUtils.isEmpty(normalize(companyName)) || StringUtils.isEmpty(normalize(legalPerson)))
        {
            throw new ServiceException("请填写公司名称和法定代表人后再提交核验");
        }
        checkVerifyRateLimit(resourcePath);

        try
        {
            Client client = buildClient();
            VerifyBusinessLicenseRequest request = new VerifyBusinessLicenseRequest()
                    .setCreditCode(submittedCode)
                    .setCompanyName(normalize(companyName))
                    .setLegalPerson(normalize(legalPerson));
            VerifyBusinessLicenseResponse response = client.verifyBusinessLicense(request);
            String data = response.getBody() == null ? null : response.getBody().getData();
            applyVerify(result, data);
            if (result.isVerified())
            {
                // 以通过工商核验的三要素覆盖 OCR 记录，避免 OCR 误读值随核验通过被误落库。
                result.setCompanyName(normalize(companyName));
                result.setLegalPerson(normalize(legalPerson));
            }
            storeRecord(resourcePath, result);
            return result;
        }
        catch (TeaException exception)
        {
            log.warn("Aliyun license verify failed for {}: {}", resourcePath, exception.getMessage());
            throw new ServiceException("营业执照核验服务暂时不可用，请稍后重试");
        }
        catch (Exception exception)
        {
            log.warn("Aliyun license verify error for {}", resourcePath, exception);
            throw new ServiceException("营业执照核验失败，请稍后重试");
        }
    }

    /**
     * 提交申请时校验存在已通过的核验记录，返回服务端保存的权威字段。
     */
    public LicenseVerifyResult requireVerified(String resourcePath)
    {
        LicenseVerifyResult result = redisCache.getCacheObject(CACHE_PREFIX + resourcePath);
        if (result == null || !result.isVerified())
        {
            throw new ServiceException("请先上传营业执照并完成核验后再提交申请");
        }
        return result;
    }

    private void applyRecognized(LicenseVerifyResult result, String data)
    {
        JSONObject root = StringUtils.isEmpty(data) ? null : JSON.parseObject(data);
        JSONObject inner = root == null ? null : root.getJSONObject("data");
        if (inner == null)
        {
            result.setVerifyMessage("未能识别出营业执照内容，请重新上传清晰图片");
            return;
        }
        String creditCode = normalize(inner.getString("creditCode"));
        if (creditCode == null || !creditCode.matches("[0-9A-Z]{18}"))
        {
            result.setVerifyMessage("未能识别出有效统一社会信用代码，请重新上传清晰图片");
            return;
        }
        result.setRecognized(true);
        result.setCreditCode(creditCode);
        result.setCompanyName(normalize(inner.getString("companyName")));
        result.setBusinessAddress(normalize(inner.getString("businessAddress")));
        result.setLegalPerson(normalize(inner.getString("legalPerson")));
    }

    private void applyVerify(LicenseVerifyResult result, String data)
    {
        JSONObject payload = StringUtils.isEmpty(data) ? null : JSON.parseObject(data);
        String code = payload == null ? null : payload.getString("code");
        boolean matched = payload != null && Boolean.TRUE.equals(payload.getBoolean("data"));
        String providerMessage = payload == null ? null : payload.getString("message");
        if ("0".equals(code) && matched)
        {
            result.setVerified(true);
            result.setVerifyMessage("营业执照核验通过");
            return;
        }
        result.setVerified(false);
        result.setVerifyMessage(toVerifyFailMessage(code, providerMessage));
    }

    private String toVerifyFailMessage(String code, String providerMessage)
    {
        if ("20001".equals(code))
        {
            return "此公司在工商数据库中不存在，请核对营业执照";
        }
        if ("20002".equals(code))
        {
            return "法定代表人姓名与工商登记不一致，请核对后重试";
        }
        if ("20003".equals(code))
        {
            return "统一社会信用代码与工商登记不一致，请核对后重试";
        }
        return StringUtils.isEmpty(providerMessage) ? "营业执照核验未通过，请核对填写信息" : providerMessage;
    }

    private LicenseVerifyResult requireRecognized(String resourcePath)
    {
        LicenseVerifyResult result = redisCache.getCacheObject(CACHE_PREFIX + resourcePath);
        if (result == null || !result.isRecognized())
        {
            throw new ServiceException("请先上传营业执照并完成识别");
        }
        return result;
    }

    private void storeRecord(String resourcePath, LicenseVerifyResult result)
    {
        int seconds = Math.max(1, properties.getVerifyCacheHours()) * 3600;
        redisCache.setCacheObject(CACHE_PREFIX + resourcePath, result, seconds, TimeUnit.SECONDS);
    }

    private void checkVerifyRateLimit(String resourcePath)
    {
        int max = Math.max(1, properties.getVerifyMaxPerFile());
        String key = RATE_PREFIX + resourcePath;
        Long count = redisCache.redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1)
        {
            redisCache.redisTemplate.expire(key, 1, TimeUnit.HOURS);
        }
        if (count != null && count > max)
        {
            throw new ServiceException("核验请求过于频繁，请稍后再试");
        }
    }

    private boolean isConfigured()
    {
        return properties.isEnabled()
                && !StringUtils.isEmpty(StringUtils.trim(properties.getAccessKeyId()))
                && !StringUtils.isEmpty(StringUtils.trim(properties.getAccessKeySecret()));
    }

    private Client buildClient()
    {
        Config config = new Config();
        config.setAccessKeyId(properties.getAccessKeyId().trim());
        config.setAccessKeySecret(properties.getAccessKeySecret().trim());
        config.setEndpoint(properties.getEndpoint().trim());
        config.setConnectTimeout(Math.max(1, properties.getConnectTimeoutSeconds()) * 1000);
        config.setReadTimeout(Math.max(1, properties.getRequestTimeoutSeconds()) * 1000);
        try
        {
            return new Client(config);
        }
        catch (Exception exception)
        {
            log.warn("Aliyun license client init failed", exception);
            throw new ServiceException("营业执照识别服务初始化失败，请联系平台管理员");
        }
    }

    private Path resolveResourcePath(String resourcePath)
    {
        if (StringUtils.isEmpty(resourcePath) || !resourcePath.matches(LICENSE_PATH_PATTERN))
        {
            throw new ServiceException("请上传有效的营业执照图片");
        }
        Path profile = Paths.get(RuoYiConfig.getProfile()).toAbsolutePath().normalize();
        Path uploaded = profile.resolve(resourcePath.substring("/profile/".length())).normalize();
        if (!uploaded.startsWith(profile) || !Files.isRegularFile(uploaded))
        {
            throw new ServiceException("营业执照图片不存在，请重新上传");
        }
        return uploaded;
    }

    private String normalize(String value)
    {
        return value == null ? null : value.trim();
    }
}
