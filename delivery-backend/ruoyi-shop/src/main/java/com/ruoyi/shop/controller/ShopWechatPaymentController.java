package com.ruoyi.shop.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Anonymous;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.shop.domain.dto.WechatPaymentPrepareBody;
import com.ruoyi.shop.payment.ShopWechatPaymentService;
import com.ruoyi.shop.payment.WechatPayGateway;
import com.wechat.pay.java.core.exception.ValidationException;

@RestController
@RequestMapping("/shop/payments/wechat")
public class ShopWechatPaymentController
{
    private static final Logger log = LoggerFactory.getLogger(ShopWechatPaymentController.class);
    private final ShopWechatPaymentService paymentService;

    public ShopWechatPaymentController(ShopWechatPaymentService paymentService)
    {
        this.paymentService = paymentService;
    }

    @PostMapping("/{orderId}/prepare")
    public AjaxResult prepare(@PathVariable long orderId,
            @Valid @RequestBody WechatPaymentPrepareBody body, HttpServletRequest request)
    {
        return AjaxResult.success(paymentService.prepare(orderId, body,
                request.getHeader("User-Agent")));
    }

    @GetMapping("/{orderId}/status")
    public AjaxResult status(@PathVariable long orderId)
    {
        return AjaxResult.success(paymentService.reconcileUserOrder(orderId));
    }

    @Anonymous
    @PostMapping("/notify/payment")
    public ResponseEntity<Void> paymentNotify(
            @RequestHeader("Wechatpay-Serial") String serial,
            @RequestHeader("Wechatpay-Nonce") String nonce,
            @RequestHeader("Wechatpay-Signature") String signature,
            @RequestHeader("Wechatpay-Timestamp") String timestamp,
            @RequestBody String body)
    {
        try
        {
            paymentService.handlePaymentNotification(notification(serial, nonce, signature, timestamp, body));
            return ResponseEntity.ok().build();
        }
        catch (ValidationException exception)
        {
            log.warn("微信支付通知验签失败", exception);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        catch (Exception exception)
        {
            log.error("微信支付通知处理失败", exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Anonymous
    @PostMapping("/notify/refund")
    public ResponseEntity<Void> refundNotify(
            @RequestHeader("Wechatpay-Serial") String serial,
            @RequestHeader("Wechatpay-Nonce") String nonce,
            @RequestHeader("Wechatpay-Signature") String signature,
            @RequestHeader("Wechatpay-Timestamp") String timestamp,
            @RequestBody String body)
    {
        try
        {
            paymentService.handleRefundNotification(notification(serial, nonce, signature, timestamp, body));
            return ResponseEntity.ok().build();
        }
        catch (ValidationException exception)
        {
            log.warn("微信退款通知验签失败", exception);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        catch (Exception exception)
        {
            log.error("微信退款通知处理失败", exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private WechatPayGateway.NotificationRequest notification(String serial, String nonce,
            String signature, String timestamp, String body)
    {
        return new WechatPayGateway.NotificationRequest(serial, nonce, signature, timestamp, body);
    }
}
