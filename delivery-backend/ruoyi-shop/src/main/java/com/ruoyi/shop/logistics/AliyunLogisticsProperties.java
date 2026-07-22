package com.ruoyi.shop.logistics;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aliyun-logistics")
public class AliyunLogisticsProperties
{
    private boolean enabled;
    private String endpoint = "https://wuliu.market.alicloudapi.com/kdi";
    private String appCode;
    private int connectTimeoutSeconds = 5;
    private int requestTimeoutSeconds = 8;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getAppCode() { return appCode; }
    public void setAppCode(String appCode) { this.appCode = appCode; }
    public int getConnectTimeoutSeconds() { return connectTimeoutSeconds; }
    public void setConnectTimeoutSeconds(int connectTimeoutSeconds) { this.connectTimeoutSeconds = connectTimeoutSeconds; }
    public int getRequestTimeoutSeconds() { return requestTimeoutSeconds; }
    public void setRequestTimeoutSeconds(int requestTimeoutSeconds) { this.requestTimeoutSeconds = requestTimeoutSeconds; }
}
