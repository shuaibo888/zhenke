package com.ruoyi.shop.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.ruoyi.shop.service.ShopTrialService;

@Component
public class ShopTrialExpiryScheduler
{
    private static final Logger log = LoggerFactory.getLogger(ShopTrialExpiryScheduler.class);

    private final ShopTrialService trialService;

    public ShopTrialExpiryScheduler(ShopTrialService trialService)
    {
        this.trialService = trialService;
    }

    @Scheduled(cron = "${shop.trial.expiry-cron:0 0 0 * * ?}",
            zone = "${shop.trial.expiry-zone:Asia/Shanghai}")
    public void closeEndedRecruitingCampaigns()
    {
        try
        {
            trialService.closeEndedRecruitingCampaigns();
        }
        catch (Exception exception)
        {
            log.error("关闭已截止或已满额的试用招募失败", exception);
        }
    }
}
