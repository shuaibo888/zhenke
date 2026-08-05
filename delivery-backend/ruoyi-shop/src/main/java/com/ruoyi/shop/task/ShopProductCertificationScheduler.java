package com.ruoyi.shop.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.ruoyi.shop.ai.ShopProductCertificationAiService;

@Component
public class ShopProductCertificationScheduler
{
    private static final Logger log = LoggerFactory.getLogger(ShopProductCertificationScheduler.class);
    private final ShopProductCertificationAiService aiService;

    public ShopProductCertificationScheduler(ShopProductCertificationAiService aiService)
    {
        this.aiService = aiService;
    }

    @Scheduled(fixedDelayString = "${shop.product-certification.poll-delay-ms:5000}")
    public void process()
    {
        try
        {
            aiService.processBatch();
        }
        catch (Exception exception)
        {
            log.error("商品平台AI认证调度失败", exception);
        }
    }
}
