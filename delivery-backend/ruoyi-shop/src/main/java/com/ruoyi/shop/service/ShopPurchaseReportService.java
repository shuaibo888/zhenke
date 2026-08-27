package com.ruoyi.shop.service;

import java.util.HashSet;
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
    private final ShopReportResourceService resourceService;

    public ShopPurchaseReportService(ShopOrderMapper orderMapper, ShopTrialMapper trialMapper,
            ShopTrialService trialService, ShopReportResourceService resourceService)
    {
        this.orderMapper = orderMapper;
        this.trialMapper = trialMapper;
        this.trialService = trialService;
        this.resourceService = resourceService;
    }

    @Transactional
    public ShopVerificationReport publish(ShopPurchaseReportBody body)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        if (body.getResources() == null
                || body.getResources().stream().noneMatch(item -> "IMAGE".equals(item.getResourceType())))
        {
            throw new ServiceException("请至少上传一张图片");
        }
        if (body.getResources().stream().filter(item -> "VIDEO".equals(item.getResourceType())).count() > 1)
        {
            throw new ServiceException("最多上传一个视频");
        }
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
            throw new ServiceException("请填写具体、客观的优化建议");
        }

        ShopVerificationReport report = new ShopVerificationReport();
        report.setProductId(orderItem.getProductId());
        report.setReportSource("PURCHASE");
        report.setOrderItemId(orderItem.getOrderItemId());
        report.setSourceReportId(orderItem.getSourceReportId());
        report.setShopUserId(shopUserId);
        report.setTitle(StringUtils.trim(body.getTitle()));
        report.setExperience(experience);
        report.setShortcoming(shortcoming);
        report.setFitCrowd("");
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
        Set<String> resourceUrls = new HashSet<>();
        if (body.getResources() != null)
        {
            for (ShopVerificationResourceBody item : body.getResources())
            {
                String resourceUrl = resourceService.normalizeOwnedResourceUrl(
                        shopUserId, item.getResourceType(), item.getResourceUrl());
                if (!resourceUrls.add(resourceUrl))
                {
                    throw new ServiceException("同一甄客验不能重复使用同一个媒体");
                }
                ShopVerificationReportResource resource = new ShopVerificationReportResource();
                resource.setReportId(report.getReportId());
                resource.setResourceType(item.getResourceType());
                resource.setResourceUrl(resourceUrl);
                resource.setResourceSort(sort++);
                if (trialMapper.insertReportResource(resource) != 1)
                {
                    throw new ServiceException("甄客验媒体保存失败，请稍后重试");
                }
            }
        }
        return trialService.publishedReport(report.getReportId());
    }
}
