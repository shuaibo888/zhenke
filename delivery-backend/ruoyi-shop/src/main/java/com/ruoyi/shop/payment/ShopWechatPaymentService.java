package com.ruoyi.shop.payment;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Date;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopOrderRefund;
import com.ruoyi.shop.domain.dto.WechatPaymentPrepareBody;
import com.ruoyi.shop.domain.vo.WechatPaymentPrepareResult;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.service.ShopOrderService;
import com.wechat.pay.java.core.exception.HttpException;
import com.wechat.pay.java.core.exception.MalformedMessageException;
import com.wechat.pay.java.core.exception.ValidationException;
import com.wechat.pay.java.service.payments.model.Transaction;
import com.wechat.pay.java.service.refund.model.Refund;
import com.wechat.pay.java.service.refund.model.RefundNotification;
import com.wechat.pay.java.service.refund.model.Status;

@Service
public class ShopWechatPaymentService
{
    private static final Logger log = LoggerFactory.getLogger(ShopWechatPaymentService.class);
    private static final ZoneId CHINA_ZONE = ZoneId.of("Asia/Shanghai");
    private static final long OAUTH_STATE_TTL_SECONDS = 10 * 60L;

    private final WechatPayProperties properties;
    private final WechatPayGateway gateway;
    private final ShopOrderMapper orderMapper;
    private final ShopOrderService orderService;
    private final HttpClient httpClient = HttpClient.newBuilder().build();

    public ShopWechatPaymentService(WechatPayProperties properties, WechatPayGateway gateway,
            ShopOrderMapper orderMapper, ShopOrderService orderService)
    {
        this.properties = properties;
        this.gateway = gateway;
        this.orderMapper = orderMapper;
        this.orderService = orderService;
    }

    @Transactional
    public WechatPaymentPrepareResult prepare(long orderId, WechatPaymentPrepareBody body, String userAgent)
    {
        requireEnabled();
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = requirePayableUserOrder(userId, orderId, false);
        if (userAgent == null || !userAgent.toLowerCase(Locale.ROOT).contains("micromessenger"))
        {
            throw new ServiceException("当前仅支持微信内 JSAPI 支付，请使用微信打开本页面");
        }
        if (StringUtils.isEmpty(StringUtils.trim(body.getCode())))
        {
            return WechatPaymentPrepareResult.oauth(buildOauthUrl(userId, orderId));
        }
        verifyOauthState(body.getState(), userId, orderId);
        String openId = exchangeOpenId(body.getCode());
        order = requirePayableUserOrder(userId, orderId, true);
        markWechatPrepay(order, "JSAPI");
        WechatPayGateway.JsapiParameters parameters = gateway.createJsapiPayment(
                toPaymentOrder(order), openId);
        return WechatPaymentPrepareResult.jsapi(parameters.appId(), parameters.timeStamp(),
                parameters.nonceStr(), parameters.packageValue(), parameters.signType(), parameters.paySign());
    }

    public ShopOrder reconcileUserOrder(long orderId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = orderMapper.selectUserOrder(userId, orderId);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        if (ShopOrderService.PENDING_PAYMENT.equals(order.getStatus())
                && "WECHAT".equals(order.getPaymentChannel()))
        {
            requireActiveMerchant(order);
            try
            {
                processSuccessfulTransaction(gateway.queryOrder(order.getOrderNo()));
            }
            catch (com.wechat.pay.java.core.exception.ServiceException exception)
            {
                if (!isOrderNotFound(exception))
                {
                    throw paymentException("微信支付查单失败", exception);
                }
            }
            catch (HttpException | ValidationException | MalformedMessageException exception)
            {
                throw new ServiceException("微信支付查单失败，请稍后重试");
            }
        }
        return orderService.myOrder(orderId);
    }

    @Transactional
    public ShopOrder cancelUserOrder(long orderId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = orderMapper.selectUserOrderForUpdate(userId, orderId);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        if (!closeWechatOrderIfNecessary(order))
        {
            return orderService.myOrder(orderId);
        }
        return orderService.cancel(orderId);
    }

    /** 对同一订单加锁后先关微信订单，再执行本地超时取消，避免预下单并发窗口。 */
    @Transactional
    public boolean expirePendingOrder(long orderId)
    {
        ShopOrder order = orderMapper.selectOrderForUpdate(orderId);
        if (order == null || !ShopOrderService.PENDING_PAYMENT.equals(order.getStatus()))
        {
            return false;
        }
        if (!closeWechatOrderIfNecessary(order))
        {
            return false;
        }
        return orderService.expirePendingOrder(orderId);
    }

    public void handlePaymentNotification(WechatPayGateway.NotificationRequest request)
    {
        Transaction transaction = gateway.parsePaymentNotification(request);
        processSuccessfulTransaction(transaction);
    }

    public boolean tryInitiateRefund(long orderId)
    {
        if (!gateway.isEnabled())
        {
            log.warn("微信退款未发起：微信支付未启用，orderId={}", orderId);
            return false;
        }
        ShopOrder order = orderMapper.selectAdminOrder(orderId);
        ShopOrderRefund refund = orderMapper.selectLatestRefund(orderId);
        if (order == null || refund == null
                || !ShopOrderService.REFUNDING.equals(order.getStatus())
                || !ShopOrderService.REFUND_STATUS_REFUNDING.equals(refund.getRefundStatus()))
        {
            return false;
        }
        if (!"WECHAT".equals(order.getPaymentChannel()) || StringUtils.isEmpty(refund.getOutRefundNo()))
        {
            orderMapper.updateRefundChannelResult(refund.getRefundId(), null, "ERROR",
                    "订单不是有效的微信支付订单或商户退款单号缺失");
            return false;
        }
        if (!matchesActiveMerchant(order))
        {
            orderMapper.updateRefundChannelResult(refund.getRefundId(), null, "MERCHANT_MISMATCH",
                    "订单所属微信商户与当前启用商户不一致，请切回原商户配置处理退款");
            return false;
        }
        try
        {
            Refund result = "PROCESSING".equals(refund.getChannelStatus())
                    ? gateway.queryRefund(refund.getOutRefundNo())
                    : gateway.createRefund(new WechatPayGateway.RefundOrder(order.getOrderNo(),
                            refund.getOutRefundNo(), toFenLong(order.getTotalAmount()), refund.getRefundReason()));
            handleRefundResult(order, refund, result);
            return true;
        }
        catch (Exception exception)
        {
            String error = channelError(exception);
            orderMapper.updateRefundChannelResult(refund.getRefundId(), null, "ERROR", error);
            log.error("微信退款请求失败，orderId={}, outRefundNo={}", orderId, refund.getOutRefundNo(), exception);
            return false;
        }
    }

    public void handleRefundNotification(WechatPayGateway.NotificationRequest request)
    {
        RefundNotification notification = gateway.parseRefundNotification(request);
        ShopOrderRefund refund = orderMapper.selectRefundByOutRefundNo(notification.getOutRefundNo());
        if (refund == null)
        {
            throw new ServiceException("微信退款通知对应的退款申请不存在");
        }
        ShopOrder order = orderMapper.selectAdminOrder(refund.getOrderId());
        validateRefundNotification(order, notification);
        String channelStatus = notification.getRefundStatus() == null
                ? "UNKNOWN" : notification.getRefundStatus().name();
        orderMapper.updateRefundChannelResult(refund.getRefundId(), notification.getRefundId(),
                channelStatus, null);
        if (notification.getRefundStatus() == Status.SUCCESS)
        {
            orderService.confirmRefundSucceeded(order.getOrderId(), notification.getOutRefundNo());
        }
    }

    private void handleRefundResult(ShopOrder order, ShopOrderRefund refund, Refund result)
    {
        validateRefundResult(order, refund, result);
        String channelStatus = result.getStatus() == null ? "UNKNOWN" : result.getStatus().name();
        orderMapper.updateRefundChannelResult(refund.getRefundId(), result.getRefundId(), channelStatus, null);
        if (result.getStatus() == Status.SUCCESS)
        {
            orderService.confirmRefundSucceeded(order.getOrderId(), refund.getOutRefundNo());
        }
    }

    private void validateRefundNotification(ShopOrder order, RefundNotification notification)
    {
        if (order == null || !order.getOrderNo().equals(notification.getOutTradeNo()))
        {
            throw new ServiceException("微信退款通知的商户订单号不匹配");
        }
        if (StringUtils.isNotEmpty(order.getWechatTransactionId())
                && !order.getWechatTransactionId().equals(notification.getTransactionId()))
        {
            throw new ServiceException("微信退款通知的微信支付订单号不匹配");
        }
        if (notification.getAmount() == null
                || notification.getAmount().getRefund() == null
                || notification.getAmount().getTotal() == null
                || notification.getAmount().getRefund().longValue() != toFenLong(order.getTotalAmount())
                || notification.getAmount().getTotal().longValue() != toFenLong(order.getTotalAmount()))
        {
            throw new ServiceException("微信退款通知金额与订单金额不一致");
        }
    }

    private void validateRefundResult(ShopOrder order, ShopOrderRefund refund, Refund result)
    {
        if (result == null || !refund.getOutRefundNo().equals(result.getOutRefundNo())
                || !order.getOrderNo().equals(result.getOutTradeNo())
                || (StringUtils.isNotEmpty(order.getWechatTransactionId())
                    && !order.getWechatTransactionId().equals(result.getTransactionId()))
                || result.getAmount() == null || result.getAmount().getRefund() == null
                || result.getAmount().getTotal() == null
                || result.getAmount().getRefund().longValue() != toFenLong(order.getTotalAmount())
                || result.getAmount().getTotal().longValue() != toFenLong(order.getTotalAmount()))
        {
            throw new ServiceException("微信退款结果与当前订单或退款申请不一致");
        }
    }

    private boolean closeWechatOrderIfNecessary(ShopOrder order)
    {
        if (!ShopOrderService.PENDING_PAYMENT.equals(order.getStatus())
                || !"WECHAT".equals(order.getPaymentChannel()))
        {
            return true;
        }
        requireActiveMerchant(order);
        try
        {
            gateway.closeOrder(order.getOrderNo());
            return true;
        }
        catch (com.wechat.pay.java.core.exception.ServiceException exception)
        {
            if (isOrderNotFound(exception))
            {
                return true;
            }
            if ("ORDERPAID".equals(exception.getErrorCode()))
            {
                processSuccessfulTransaction(gateway.queryOrder(order.getOrderNo()));
                return false;
            }
            throw paymentException("微信支付关单失败", exception);
        }
        catch (HttpException | ValidationException | MalformedMessageException exception)
        {
            throw new ServiceException("暂时无法确认微信侧订单状态，请稍后重试");
        }
    }

    private void processSuccessfulTransaction(Transaction transaction)
    {
        if (transaction == null || transaction.getTradeState() != Transaction.TradeStateEnum.SUCCESS)
        {
            return;
        }
        if (transaction.getAmount() == null || transaction.getAmount().getTotal() == null
                || StringUtils.isEmpty(transaction.getOutTradeNo())
                || StringUtils.isEmpty(transaction.getTransactionId())
                || StringUtils.isEmpty(transaction.getMchid()) || StringUtils.isEmpty(transaction.getAppid())
                || transaction.getTradeType() == null)
        {
            throw new ServiceException("微信支付成功结果缺少必要字段");
        }
        String tradeType = transaction.getTradeType() == Transaction.TradeTypeEnum.MWEB
                ? "H5" : transaction.getTradeType().name();
        orderService.confirmWechatPayment(transaction.getOutTradeNo(), transaction.getTransactionId(), tradeType,
                transaction.getMchid(), transaction.getAppid(), transaction.getAmount().getTotal());
    }

    private void markWechatPrepay(ShopOrder order, String tradeType)
    {
        if (orderMapper.markWechatPrepay(order.getUserId(), order.getOrderId(), tradeType,
                properties.getMerchantId(), properties.getAppId()) == 0)
        {
            throw new ServiceException("订单已使用其他支付场景或状态已变化，请刷新后重试");
        }
        order.setPaymentChannel("WECHAT");
        order.setPaymentTradeType(tradeType);
        order.setPaymentMchId(properties.getMerchantId());
        order.setPaymentAppId(properties.getAppId());
    }

    private ShopOrder requirePayableUserOrder(long userId, long orderId, boolean forUpdate)
    {
        ShopOrder order = forUpdate
                ? orderMapper.selectUserOrderForUpdate(userId, orderId)
                : orderMapper.selectUserOrder(userId, orderId);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        if (!ShopOrderService.PENDING_PAYMENT.equals(order.getStatus()))
        {
            throw new ServiceException(ShopOrderService.PAID.equals(order.getStatus())
                    ? "订单已支付，请勿重复操作" : "只有待付款订单可以支付");
        }
        if (order.getPaymentExpireTime() == null || !order.getPaymentExpireTime().after(new Date()))
        {
            throw new ServiceException("订单已超过30分钟支付时间，系统正在取消，请刷新订单");
        }
        return order;
    }

    private WechatPayGateway.PaymentOrder toPaymentOrder(ShopOrder order)
    {
        String description = orderMapper.selectOrderItems(order.getOrderId()).stream()
                .map(ShopOrderItem::getProductName).filter(StringUtils::isNotEmpty)
                .findFirst().orElse("甄客商城订单");
        if (description.length() > 127)
        {
            description = description.substring(0, 127);
        }
        String timeExpire = OffsetDateTime.ofInstant(order.getPaymentExpireTime().toInstant(), CHINA_ZONE)
                .withNano(0).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        return new WechatPayGateway.PaymentOrder(order.getOrderId(), order.getOrderNo(),
                toFen(order.getTotalAmount()), description, timeExpire);
    }

    private String buildOauthUrl(long userId, long orderId)
    {
        String redirectUrl = addQuery(properties.getFrontendReturnUrl(), "wechatPayOrderId=" + orderId);
        String state = signOauthState(userId, orderId, Instant.now().getEpochSecond() + OAUTH_STATE_TTL_SECONDS);
        return "https://open.weixin.qq.com/connect/oauth2/authorize?appid=" + encode(properties.getAppId())
                + "&redirect_uri=" + encode(redirectUrl)
                + "&response_type=code&scope=snsapi_base&state=" + encode(state) + "#wechat_redirect";
    }

    private String exchangeOpenId(String code)
    {
        String url = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + encode(properties.getAppId())
                + "&secret=" + encode(properties.getAppSecret()) + "&code=" + encode(code)
                + "&grant_type=authorization_code";
        try
        {
            HttpResponse<String> response = httpClient.send(HttpRequest.newBuilder(URI.create(url)).GET().build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JSONObject payload = JSON.parseObject(response.body());
            String openId = payload == null ? null : payload.getString("openid");
            if (response.statusCode() != 200 || StringUtils.isEmpty(openId))
            {
                throw new ServiceException("微信网页授权失败：" + (payload == null ? "响应无效" : payload.getString("errmsg")));
            }
            return openId;
        }
        catch (InterruptedException exception)
        {
            Thread.currentThread().interrupt();
            throw new ServiceException("微信网页授权被中断");
        }
        catch (java.io.IOException exception)
        {
            throw new ServiceException("微信网页授权请求失败，请稍后重试");
        }
    }

    private String signOauthState(long userId, long orderId, long expiresAt)
    {
        String payload = userId + ":" + orderId + ":" + expiresAt;
        return base64Url(payload.getBytes(StandardCharsets.UTF_8)) + "." + base64Url(hmac(payload));
    }

    private void verifyOauthState(String state, long userId, long orderId)
    {
        try
        {
            String[] parts = state == null ? new String[0] : state.split("\\.", -1);
            if (parts.length != 2)
            {
                throw new ServiceException("微信网页授权状态无效，请重新发起支付");
            }
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            byte[] expected = hmac(payload);
            byte[] supplied = Base64.getUrlDecoder().decode(parts[1]);
            String[] values = payload.split(":", -1);
            if (!MessageDigest.isEqual(expected, supplied) || values.length != 3
                    || Long.parseLong(values[0]) != userId || Long.parseLong(values[1]) != orderId
                    || Long.parseLong(values[2]) < Instant.now().getEpochSecond())
            {
                throw new ServiceException("微信网页授权状态已失效，请重新发起支付");
            }
        }
        catch (IllegalArgumentException exception)
        {
            throw new ServiceException("微信网页授权状态无效，请重新发起支付");
        }
    }

    private byte[] hmac(String payload)
    {
        try
        {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.getOauthStateSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        }
        catch (GeneralSecurityException exception)
        {
            throw new IllegalStateException("无法生成微信网页授权状态签名", exception);
        }
    }

    private int toFen(BigDecimal amount)
    {
        try
        {
            return amount.movePointRight(2).intValueExact();
        }
        catch (ArithmeticException exception)
        {
            throw new ServiceException("订单金额无法转换为微信支付金额");
        }
    }

    private long toFenLong(BigDecimal amount)
    {
        return toFen(amount);
    }

    private boolean isOrderNotFound(com.wechat.pay.java.core.exception.ServiceException exception)
    {
        return "ORDER_NOT_EXIST".equals(exception.getErrorCode())
                || "ORDER_NOT_EXISTS".equals(exception.getErrorCode());
    }

    private boolean matchesActiveMerchant(ShopOrder order)
    {
        return properties.getMerchantId().equals(order.getPaymentMchId())
                && properties.getAppId().equals(order.getPaymentAppId());
    }

    private void requireActiveMerchant(ShopOrder order)
    {
        if (!matchesActiveMerchant(order))
        {
            throw new ServiceException("订单所属微信商户与当前启用商户不一致，请切回原商户配置后处理");
        }
    }

    private ServiceException paymentException(String prefix,
            com.wechat.pay.java.core.exception.ServiceException exception)
    {
        return new ServiceException(prefix + "：" + exception.getErrorCode() + " " + exception.getErrorMessage());
    }

    private String channelError(Exception exception)
    {
        String value = exception instanceof com.wechat.pay.java.core.exception.ServiceException serviceException
                ? serviceException.getErrorCode() + " " + serviceException.getErrorMessage()
                : exception.getMessage();
        value = StringUtils.isEmpty(value) ? exception.getClass().getSimpleName() : value;
        return value.length() > 500 ? value.substring(0, 500) : value;
    }

    private String addQuery(String baseUrl, String query)
    {
        return baseUrl + (baseUrl.contains("?") ? "&" : "?") + query;
    }

    private String encode(String value)
    {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String base64Url(byte[] value)
    {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private void requireEnabled()
    {
        if (!gateway.isEnabled())
        {
            throw new ServiceException("微信支付尚未启用，请先完成 application.yml 配置");
        }
    }
}
