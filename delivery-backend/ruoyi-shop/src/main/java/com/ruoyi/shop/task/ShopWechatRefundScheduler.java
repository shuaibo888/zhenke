package com.ruoyi.shop.task;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.payment.ShopWechatPaymentService;

@Component
public class ShopWechatRefundScheduler
{
    private static final Logger log = LoggerFactory.getLogger(ShopWechatRefundScheduler.class);
    private static final int BATCH_SIZE = 100;

    private final ShopOrderMapper orderMapper;
    private final ShopWechatPaymentService paymentService;

    public ShopWechatRefundScheduler(ShopOrderMapper orderMapper, ShopWechatPaymentService paymentService)
    {
        this.orderMapper = orderMapper;
        this.paymentService = paymentService;
    }

    @Scheduled(initialDelayString = "${wechat-pay.refund-reconcile-initial-delay-ms:60000}",
            fixedDelayString = "${wechat-pay.refund-reconcile-delay-ms:60000}")
    public void reconcileRefunds()
    {
        List<Long> orderIds = orderMapper.selectRefundingOrderIds(BATCH_SIZE);
        for (Long orderId : orderIds)
        {
            try
            {
                paymentService.tryInitiateRefund(orderId);
            }
            catch (Exception exception)
            {
                log.error("微信退款补偿处理失败，orderId={}", orderId, exception);
            }
        }
    }
}
