package com.ruoyi.shop.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 营业执照 OCR、号码认证等阿里云 OpenAPI 共用的 RAM 访问凭证。 */
@Component
@ConfigurationProperties(prefix = "aliyun")
public class AliyunAccessKeyProperties
{
    private String accessKeyId;
    private String accessKeySecret;

    public String getAccessKeyId() { return accessKeyId; }
    public void setAccessKeyId(String accessKeyId) { this.accessKeyId = accessKeyId; }
    public String getAccessKeySecret() { return accessKeySecret; }
    public void setAccessKeySecret(String accessKeySecret) { this.accessKeySecret = accessKeySecret; }
}
