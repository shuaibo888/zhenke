package com.ruoyi.shop.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "wechat-pay")
public class WechatPayProperties
{
    private boolean enabled;
    private String appId;
    private String appSecret;
    private String merchantId;
    private String merchantSerialNumber;
    private String privateKeyPath;
    private String apiV3Key;
    private String credentialMode = "PUBLIC_KEY";
    private String wechatpayPublicKeyId;
    private String wechatpayPublicKeyPath;
    private String paymentNotifyUrl;
    private String refundNotifyUrl;
    private String frontendReturnUrl;
    private String oauthStateSecret;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getAppId() { return appId; }
    public void setAppId(String appId) { this.appId = appId; }
    public String getAppSecret() { return appSecret; }
    public void setAppSecret(String appSecret) { this.appSecret = appSecret; }
    public String getMerchantId() { return merchantId; }
    public void setMerchantId(String merchantId) { this.merchantId = merchantId; }
    public String getMerchantSerialNumber() { return merchantSerialNumber; }
    public void setMerchantSerialNumber(String merchantSerialNumber) { this.merchantSerialNumber = merchantSerialNumber; }
    public String getPrivateKeyPath() { return privateKeyPath; }
    public void setPrivateKeyPath(String privateKeyPath) { this.privateKeyPath = privateKeyPath; }
    public String getApiV3Key() { return apiV3Key; }
    public void setApiV3Key(String apiV3Key) { this.apiV3Key = apiV3Key; }
    public String getCredentialMode() { return credentialMode; }
    public void setCredentialMode(String credentialMode) { this.credentialMode = credentialMode; }
    public String getWechatpayPublicKeyId() { return wechatpayPublicKeyId; }
    public void setWechatpayPublicKeyId(String wechatpayPublicKeyId) { this.wechatpayPublicKeyId = wechatpayPublicKeyId; }
    public String getWechatpayPublicKeyPath() { return wechatpayPublicKeyPath; }
    public void setWechatpayPublicKeyPath(String wechatpayPublicKeyPath) { this.wechatpayPublicKeyPath = wechatpayPublicKeyPath; }
    public String getPaymentNotifyUrl() { return paymentNotifyUrl; }
    public void setPaymentNotifyUrl(String paymentNotifyUrl) { this.paymentNotifyUrl = paymentNotifyUrl; }
    public String getRefundNotifyUrl() { return refundNotifyUrl; }
    public void setRefundNotifyUrl(String refundNotifyUrl) { this.refundNotifyUrl = refundNotifyUrl; }
    public String getFrontendReturnUrl() { return frontendReturnUrl; }
    public void setFrontendReturnUrl(String frontendReturnUrl) { this.frontendReturnUrl = frontendReturnUrl; }
    public String getOauthStateSecret() { return oauthStateSecret; }
    public void setOauthStateSecret(String oauthStateSecret) { this.oauthStateSecret = oauthStateSecret; }
}
