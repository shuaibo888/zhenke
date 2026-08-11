package com.ruoyi.shop.phone;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aliyun-phone-auth")
public class AliyunPhoneAuthProperties
{
    private boolean enabled;
    private final Sms sms = new Sms();
    private final H5 h5 = new H5();

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public Sms getSms() { return sms; }
    public H5 getH5() { return h5; }

    public static class Sms
    {
        private String signName;
        public String getSignName() { return signName; }
        public void setSignName(String signName) { this.signName = signName; }
    }

    public static class H5
    {
        private String sceneCode;
        private String pageUrl;
        public String getSceneCode() { return sceneCode; }
        public void setSceneCode(String sceneCode) { this.sceneCode = sceneCode; }
        public String getPageUrl() { return pageUrl; }
        public void setPageUrl(String pageUrl) { this.pageUrl = pageUrl; }
    }
}
