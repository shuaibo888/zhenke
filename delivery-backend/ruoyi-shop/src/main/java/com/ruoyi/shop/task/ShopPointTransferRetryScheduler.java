package com.ruoyi.shop.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.ruoyi.shop.service.ShopPointTransferService;

/**
 * 自动恢复结果不确定的积分划拨。
 *
 * 只重复调用原划拨接口，不依赖第三个结果查询接口。
 */
@Component
public class ShopPointTransferRetryScheduler
{
    private static final Logger log = LoggerFactory.getLogger(ShopPointTransferRetryScheduler.class);

    private final ShopPointTransferService transferService;

    public ShopPointTransferRetryScheduler(ShopPointTransferService transferService)
    {
        this.transferService = transferService;
    }

    @Scheduled(initialDelayString = "${shop.event-points.retry-initial-delay-ms:15000}",
            fixedDelayString = "${shop.event-points.retry-delay-ms:15000}")
    public void retryPendingTransfers()
    {
        try
        {
            transferService.retryPendingTransfers();
        }
        catch (Exception exception)
        {
            log.error("扫描待确认积分划拨失败", exception);
        }
    }
}
