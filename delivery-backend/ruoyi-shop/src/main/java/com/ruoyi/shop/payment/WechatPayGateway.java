package com.ruoyi.shop.payment;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.stereotype.Component;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.wechat.pay.java.core.Config;
import com.wechat.pay.java.core.RSAAutoCertificateConfig;
import com.wechat.pay.java.core.RSAPublicKeyConfig;
import com.wechat.pay.java.core.notification.RSAPublicKeyNotificationConfig;
import com.wechat.pay.java.core.notification.NotificationConfig;
import com.wechat.pay.java.core.notification.NotificationParser;
import com.wechat.pay.java.core.notification.RequestParam;
import com.wechat.pay.java.service.payments.h5.H5Service;
import com.wechat.pay.java.service.payments.jsapi.JsapiServiceExtension;
import com.wechat.pay.java.service.payments.jsapi.model.PrepayWithRequestPaymentResponse;
import com.wechat.pay.java.service.payments.model.Transaction;
import com.wechat.pay.java.service.refund.RefundService;
import com.wechat.pay.java.service.refund.model.AmountReq;
import com.wechat.pay.java.service.refund.model.CreateRequest;
import com.wechat.pay.java.service.refund.model.QueryByOutRefundNoRequest;
import com.wechat.pay.java.service.refund.model.Refund;
import com.wechat.pay.java.service.refund.model.RefundNotification;

@Component
public class WechatPayGateway
{
    private final WechatPayProperties properties;
    private final JsapiServiceExtension jsapiService;
    private final H5Service h5Service;
    private final RefundService refundService;
    private final NotificationParser notificationParser;

    public WechatPayGateway(WechatPayProperties properties)
    {
        this.properties = properties;
        if (!properties.isEnabled())
        {
            this.jsapiService = null;
            this.h5Service = null;
            this.refundService = null;
            this.notificationParser = null;
            return;
        }
        validateProperties();
        Config config;
        NotificationConfig notificationConfig;
        if ("AUTO_CERTIFICATE".equalsIgnoreCase(properties.getCredentialMode()))
        {
            RSAAutoCertificateConfig autoConfig = new RSAAutoCertificateConfig.Builder()
                    .merchantId(properties.getMerchantId())
                    .privateKeyFromPath(properties.getPrivateKeyPath())
                    .merchantSerialNumber(properties.getMerchantSerialNumber())
                    .apiV3Key(properties.getApiV3Key())
                    .build();
            config = autoConfig;
            notificationConfig = autoConfig;
        }
        else
        {
            RSAPublicKeyConfig publicKeyConfig = new RSAPublicKeyConfig.Builder()
                    .merchantId(properties.getMerchantId())
                    .privateKeyFromPath(properties.getPrivateKeyPath())
                    .publicKeyFromPath(properties.getWechatpayPublicKeyPath())
                    .publicKeyId(properties.getWechatpayPublicKeyId())
                    .merchantSerialNumber(properties.getMerchantSerialNumber())
                    .apiV3Key(properties.getApiV3Key())
                    .build();
            config = publicKeyConfig;
            notificationConfig = new RSAPublicKeyNotificationConfig.Builder()
                    .publicKeyFromPath(properties.getWechatpayPublicKeyPath())
                    .publicKeyId(properties.getWechatpayPublicKeyId())
                    .apiV3Key(properties.getApiV3Key())
                    .build();
        }
        this.jsapiService = new JsapiServiceExtension.Builder().config(config).build();
        this.h5Service = new H5Service.Builder().config(config).build();
        this.refundService = new RefundService.Builder().config(config).build();
        this.notificationParser = new NotificationParser(notificationConfig);
    }

    public boolean isEnabled()
    {
        return properties.isEnabled();
    }

    public JsapiParameters createJsapiPayment(PaymentOrder order, String openId)
    {
        requireEnabled();
        com.wechat.pay.java.service.payments.jsapi.model.PrepayRequest request =
                new com.wechat.pay.java.service.payments.jsapi.model.PrepayRequest();
        com.wechat.pay.java.service.payments.jsapi.model.Amount amount =
                new com.wechat.pay.java.service.payments.jsapi.model.Amount();
        amount.setTotal(order.amountFen());
        amount.setCurrency("CNY");
        com.wechat.pay.java.service.payments.jsapi.model.Payer payer =
                new com.wechat.pay.java.service.payments.jsapi.model.Payer();
        payer.setOpenid(openId);
        request.setAppid(properties.getAppId());
        request.setMchid(properties.getMerchantId());
        request.setDescription(order.description());
        request.setOutTradeNo(order.orderNo());
        request.setTimeExpire(order.timeExpire());
        request.setAttach(String.valueOf(order.orderId()));
        request.setNotifyUrl(properties.getPaymentNotifyUrl());
        request.setAmount(amount);
        request.setPayer(payer);
        PrepayWithRequestPaymentResponse response = jsapiService.prepayWithRequestPayment(request);
        return new JsapiParameters(response.getAppId(), response.getTimeStamp(), response.getNonceStr(),
                response.getPackageVal(), response.getSignType(), response.getPaySign());
    }

    public Transaction queryOrder(String orderNo)
    {
        requireEnabled();
        com.wechat.pay.java.service.payments.h5.model.QueryOrderByOutTradeNoRequest request =
                new com.wechat.pay.java.service.payments.h5.model.QueryOrderByOutTradeNoRequest();
        request.setMchid(properties.getMerchantId());
        request.setOutTradeNo(orderNo);
        return h5Service.queryOrderByOutTradeNo(request);
    }

    public void closeOrder(String orderNo)
    {
        requireEnabled();
        com.wechat.pay.java.service.payments.h5.model.CloseOrderRequest request =
                new com.wechat.pay.java.service.payments.h5.model.CloseOrderRequest();
        request.setMchid(properties.getMerchantId());
        request.setOutTradeNo(orderNo);
        h5Service.closeOrder(request);
    }

    public Refund createRefund(RefundOrder order)
    {
        requireEnabled();
        CreateRequest request = new CreateRequest();
        request.setOutTradeNo(order.orderNo());
        request.setOutRefundNo(order.outRefundNo());
        request.setReason(order.reason());
        request.setNotifyUrl(properties.getRefundNotifyUrl());
        AmountReq amount = new AmountReq();
        amount.setRefund(order.amountFen());
        amount.setTotal(order.amountFen());
        amount.setCurrency("CNY");
        request.setAmount(amount);
        return refundService.create(request);
    }

    public Refund queryRefund(String outRefundNo)
    {
        requireEnabled();
        QueryByOutRefundNoRequest request = new QueryByOutRefundNoRequest();
        request.setOutRefundNo(outRefundNo);
        return refundService.queryByOutRefundNo(request);
    }

    public Transaction parsePaymentNotification(NotificationRequest request)
    {
        requireEnabled();
        return notificationParser.parse(toRequestParam(request), Transaction.class);
    }

    public RefundNotification parseRefundNotification(NotificationRequest request)
    {
        requireEnabled();
        return notificationParser.parse(toRequestParam(request), RefundNotification.class);
    }

    private RequestParam toRequestParam(NotificationRequest request)
    {
        return new RequestParam.Builder()
                .serialNumber(request.serial())
                .nonce(request.nonce())
                .signature(request.signature())
                .timestamp(request.timestamp())
                .body(request.body())
                .build();
    }

    private void requireEnabled()
    {
        if (!properties.isEnabled())
        {
            throw new ServiceException("微信支付尚未启用，请先完成 application.yml 配置");
        }
    }

    private void validateProperties()
    {
        requireText(properties.getAppId(), "app-id");
        requireText(properties.getAppSecret(), "app-secret");
        requireText(properties.getMerchantId(), "merchant-id");
        requireText(properties.getMerchantSerialNumber(), "merchant-serial-number");
        requireText(properties.getPrivateKeyPath(), "private-key-path");
        requireText(properties.getApiV3Key(), "api-v3-key");
        requireText(properties.getPaymentNotifyUrl(), "payment-notify-url");
        requireText(properties.getRefundNotifyUrl(), "refund-notify-url");
        requireText(properties.getFrontendReturnUrl(), "frontend-return-url");
        requireText(properties.getOauthStateSecret(), "oauth-state-secret");
        if (properties.getOauthStateSecret().length() < 32)
        {
            throw new IllegalStateException("wechat-pay.oauth-state-secret 至少需要32个字符");
        }
        if (properties.getApiV3Key().getBytes(StandardCharsets.UTF_8).length != 32)
        {
            throw new IllegalStateException("wechat-pay.api-v3-key 必须是32字节");
        }
        requireHttpsUrl(properties.getPaymentNotifyUrl(), "payment-notify-url", false);
        requireHttpsUrl(properties.getRefundNotifyUrl(), "refund-notify-url", false);
        requireHttpsUrl(properties.getFrontendReturnUrl(), "frontend-return-url", false);
        String mode = properties.getCredentialMode() == null ? "" :
                properties.getCredentialMode().toUpperCase(Locale.ROOT);
        if (!"PUBLIC_KEY".equals(mode) && !"AUTO_CERTIFICATE".equals(mode))
        {
            throw new IllegalStateException("wechat-pay.credential-mode 仅支持 PUBLIC_KEY 或 AUTO_CERTIFICATE");
        }
        if ("PUBLIC_KEY".equals(mode))
        {
            requireText(properties.getWechatpayPublicKeyId(), "wechatpay-public-key-id");
            requireText(properties.getWechatpayPublicKeyPath(), "wechatpay-public-key-path");
        }
    }

    private void requireText(String value, String name)
    {
        if (StringUtils.isEmpty(StringUtils.trim(value)))
        {
            throw new IllegalStateException("wechat-pay." + name + " 未配置");
        }
    }

    private void requireHttpsUrl(String value, String name, boolean allowQuery)
    {
        try
        {
            URI uri = new URI(value);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || StringUtils.isEmpty(uri.getHost())
                    || (!allowQuery && uri.getRawQuery() != null))
            {
                throw new IllegalStateException("wechat-pay." + name + " 必须是公网 HTTPS 地址"
                        + (allowQuery ? "" : "且不能携带查询参数"));
            }
        }
        catch (URISyntaxException exception)
        {
            throw new IllegalStateException("wechat-pay." + name + " 不是合法 URL", exception);
        }
    }

    public record PaymentOrder(long orderId, String orderNo, int amountFen,
            String description, String timeExpire) { }
    public record RefundOrder(String orderNo, String outRefundNo, long amountFen, String reason) { }
    public record JsapiParameters(String appId, String timeStamp, String nonceStr,
            String packageValue, String signType, String paySign) { }
    public record NotificationRequest(String serial, String nonce, String signature,
            String timestamp, String body) { }
}
