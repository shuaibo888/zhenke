package com.ruoyi.shop.task;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.payment.ShopWechatPaymentService;

@Component
public class ShopOrderExpiryScheduler
{
    private static final Logger log = LoggerFactory.getLogger(ShopOrderExpiryScheduler.class);
    private static final int BATCH_SIZE = 100;

    private final ShopOrderMapper orderMapper;
    private final ShopWechatPaymentService paymentService;

    public ShopOrderExpiryScheduler(ShopOrderMapper orderMapper, ShopWechatPaymentService paymentService)
    {
        this.orderMapper = orderMapper;
        this.paymentService = paymentService;
    }

    @Scheduled(initialDelayString = "${shop.order.expiry-initial-delay-ms:30000}",
            fixedDelayString = "${shop.order.expiry-scan-delay-ms:30000}")
    public void expirePendingOrders()
    {
        List<Long> orderIds = orderMapper.selectExpiredPendingOrderIds(BATCH_SIZE);
        for (Long orderId : orderIds)
        {
            try
            {
                paymentService.expirePendingOrder(orderId);
            }
            catch (Exception exception)
            {
                log.error("取消超时待付款订单失败，orderId={}", orderId, exception);
            }
        }
    }
}
