package com.ruoyi.shop.domain.vo;

public class WechatPaymentPrepareResult
{
    private String type;
    private String oauthUrl;
    private String appId;
    private String timeStamp;
    private String nonceStr;
    private String packageValue;
    private String signType;
    private String paySign;

    public static WechatPaymentPrepareResult oauth(String oauthUrl)
    {
        WechatPaymentPrepareResult result = new WechatPaymentPrepareResult();
        result.type = "OAUTH";
        result.oauthUrl = oauthUrl;
        return result;
    }

    public static WechatPaymentPrepareResult jsapi(String appId, String timeStamp, String nonceStr,
            String packageValue, String signType, String paySign)
    {
        WechatPaymentPrepareResult result = new WechatPaymentPrepareResult();
        result.type = "JSAPI";
        result.appId = appId;
        result.timeStamp = timeStamp;
        result.nonceStr = nonceStr;
        result.packageValue = packageValue;
        result.signType = signType;
        result.paySign = paySign;
        return result;
    }

    public String getType() { return type; }
    public String getOauthUrl() { return oauthUrl; }
    public String getAppId() { return appId; }
    public String getTimeStamp() { return timeStamp; }
    public String getNonceStr() { return nonceStr; }
    public String getPackageValue() { return packageValue; }
    public String getSignType() { return signType; }
    public String getPaySign() { return paySign; }
}
