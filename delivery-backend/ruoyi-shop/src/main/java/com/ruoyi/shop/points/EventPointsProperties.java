package com.ruoyi.shop.points;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "shop.event-points")
public class EventPointsProperties
{
    private String balanceUrl;
    private String transferUrl;
    private String clientSecret;

    public String getBalanceUrl() { return balanceUrl; }
    public void setBalanceUrl(String balanceUrl) { this.balanceUrl = balanceUrl; }
    public String getTransferUrl() { return transferUrl; }
    public void setTransferUrl(String transferUrl) { this.transferUrl = transferUrl; }
    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
}
