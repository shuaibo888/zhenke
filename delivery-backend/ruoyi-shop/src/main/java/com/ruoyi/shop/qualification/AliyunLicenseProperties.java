package com.ruoyi.shop.qualification;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aliyun-license")
public class AliyunLicenseProperties
{
    private boolean enabled;
    private String accessKeyId;
    private String accessKeySecret;
    private String endpoint = "ocr-api.cn-hangzhou.aliyuncs.com";
    private int connectTimeoutSeconds = 5;
    private int requestTimeoutSeconds = 8;
    private int verifyCacheHours = 24;
    private int verifyMaxPerFile = 5;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getAccessKeyId() { return accessKeyId; }
    public void setAccessKeyId(String accessKeyId) { this.accessKeyId = accessKeyId; }
    public String getAccessKeySecret() { return accessKeySecret; }
    public void setAccessKeySecret(String accessKeySecret) { this.accessKeySecret = accessKeySecret; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public int getConnectTimeoutSeconds() { return connectTimeoutSeconds; }
    public void setConnectTimeoutSeconds(int connectTimeoutSeconds) { this.connectTimeoutSeconds = connectTimeoutSeconds; }
    public int getRequestTimeoutSeconds() { return requestTimeoutSeconds; }
    public void setRequestTimeoutSeconds(int requestTimeoutSeconds) { this.requestTimeoutSeconds = requestTimeoutSeconds; }
    public int getVerifyCacheHours() { return verifyCacheHours; }
    public void setVerifyCacheHours(int verifyCacheHours) { this.verifyCacheHours = verifyCacheHours; }
    public int getVerifyMaxPerFile() { return verifyMaxPerFile; }
    public void setVerifyMaxPerFile(int verifyMaxPerFile) { this.verifyMaxPerFile = verifyMaxPerFile; }
}
