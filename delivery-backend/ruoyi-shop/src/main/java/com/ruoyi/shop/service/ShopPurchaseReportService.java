package com.ruoyi.shop.service;

import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportResource;
import com.ruoyi.shop.domain.dto.ShopPurchaseReportBody;
import com.ruoyi.shop.domain.dto.ShopVerificationResourceBody;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopPurchaseReportService
{
    private static final Set<String> INVALID_SHORTCOMINGS = Set.of(
            "无", "暂无", "没有", "都挺好", "暂时没有", "没什么", "还行", "还可以");

    private final ShopOrderMapper orderMapper;
    private final ShopTrialMapper trialMapper;
    private final ShopTrialService trialService;

    public ShopPurchaseReportService(ShopOrderMapper orderMapper, ShopTrialMapper trialMapper,
            ShopTrialService trialService)
    {
        this.orderMapper = orderMapper;
        this.trialMapper = trialMapper;
        this.trialService = trialService;
    }

    @Transactional
    public ShopVerificationReport publish(ShopPurchaseReportBody body)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopOrderItem orderItem = orderMapper.selectUserReceivedOrderItemForUpdate(
                shopUserId, body.getOrderItemId());
        if (orderItem == null)
        {
            throw new ServiceException("只有本人已确认收货的订单商品才能发布购买甄客验");
        }
        if (orderItem.getVerificationReportId() != null
                || trialMapper.countReportByOrderItem(orderItem.getOrderItemId()) > 0)
        {
            throw new ServiceException("该订单商品已经发布过甄客验");
        }

        String experience = StringUtils.trim(body.getExperience());
        String shortcoming = StringUtils.trim(body.getShortcoming());
        if (experience.length() < 20)
        {
            throw new ServiceException("真实体验至少需要20字");
        }
        if (INVALID_SHORTCOMINGS.contains(shortcoming))
        {
            throw new ServiceException("请客观描述产品不足，不能填写无效内容");
        }

        ShopVerificationReport report = new ShopVerificationReport();
        report.setProductId(orderItem.getProductId());
        report.setReportSource("PURCHASE");
        report.setOrderItemId(orderItem.getOrderItemId());
        report.setSourceReportId(orderItem.getSourceReportId());
        report.setShopUserId(shopUserId);
        report.setExperience(experience);
        report.setShortcoming(shortcoming);
        report.setFitCrowd(StringUtils.trim(body.getFitCrowd()));
        report.setRecommend(Boolean.TRUE.equals(body.getRecommend()) ? "0" : "1");
        report.setProductQuality(body.getProductQuality());
        report.setLogisticsService(body.getLogisticsService());
        report.setServiceAttitude(body.getServiceAttitude());
        report.setStatus("PUBLISHED");
        if (trialMapper.insertReport(report) == 0)
        {
            throw new ServiceException("购买甄客验发布失败");
        }

        int sort = 1;
        if (body.getResources() != null)
        {
            for (ShopVerificationResourceBody item : body.getResources())
            {
                ShopVerificationReportResource resource = new ShopVerificationReportResource();
                resource.setReportId(report.getReportId());
                resource.setResourceType(item.getResourceType());
                resource.setResourceUrl(StringUtils.trim(item.getResourceUrl()));
                resource.setResourceSort(sort++);
                trialMapper.insertReportResource(resource);
            }
        }
        return trialService.publishedReport(report.getReportId());
    }
}
