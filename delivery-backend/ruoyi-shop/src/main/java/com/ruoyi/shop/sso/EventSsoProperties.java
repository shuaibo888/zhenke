package com.ruoyi.shop.sso;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "shop.event-sso")
public class EventSsoProperties
{
    private String exchangeUrl;
    private String clientSecret;

    public String getExchangeUrl() { return exchangeUrl; }
    public void setExchangeUrl(String exchangeUrl) { this.exchangeUrl = exchangeUrl; }
    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
}
