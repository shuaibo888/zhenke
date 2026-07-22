package com.ruoyi.shop.service;

import java.util.Date;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopTrialApplication;
import com.ruoyi.shop.domain.ShopTrialCampaign;
import com.ruoyi.shop.domain.ShopUser;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportResource;
import com.ruoyi.shop.domain.dto.ShopTrialApplyBody;
import com.ruoyi.shop.domain.dto.ShopTrialAuditBody;
import com.ruoyi.shop.domain.dto.ShopTrialCampaignBody;
import com.ruoyi.shop.domain.dto.ShopTrialShipBody;
import com.ruoyi.shop.domain.dto.ShopVerificationReportBody;
import com.ruoyi.shop.domain.dto.ShopVerificationResourceBody;
import com.ruoyi.shop.domain.vo.ShopHomeFeedItem;
import com.ruoyi.shop.domain.vo.ShopLogisticsTrace;
import com.ruoyi.shop.domain.vo.ShopReportUsefulResult;
import com.ruoyi.shop.logistics.AliyunLogisticsService;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopUserMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopTrialService
{
    public static final String DRAFT = "DRAFT";
    public static final String RECRUITING = "RECRUITING";
    public static final String CLOSED = "CLOSED";
    public static final String FINISHED = "FINISHED";
    public static final String ONLINE = "ONLINE";
    public static final String OFFLINE = "OFFLINE";

    private final ShopTrialMapper trialMapper;
    private final ShopUserMapper userMapper;
    private final ShopMerchantService merchantService;
    private final ShopProductService productService;
    private final AliyunLogisticsService logisticsService;

    public ShopTrialService(ShopTrialMapper trialMapper, ShopUserMapper userMapper,
            ShopMerchantService merchantService, ShopProductService productService,
            AliyunLogisticsService logisticsService)
    {
        this.trialMapper = trialMapper;
        this.userMapper = userMapper;
        this.merchantService = merchantService;
        this.productService = productService;
        this.logisticsService = logisticsService;
    }

    public List<ShopTrialCampaign> merchantCampaigns(long merchantId, ShopTrialCampaign query)
    {
        return trialMapper.selectMerchantCampaigns(merchantId, query);
    }

    public List<ShopTrialCampaign> adminCampaigns(ShopTrialCampaign query)
    {
        return trialMapper.selectAdminCampaigns(query);
    }

    public ShopTrialCampaign merchantCampaign(long campaignId)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return requireCampaign(trialMapper.selectMerchantCampaign(merchant.getMerchantId(), campaignId));
    }

    public ShopTrialCampaign publicCampaign(long campaignId)
    {
        return requireCampaign(trialMapper.selectPublicCampaign(campaignId));
    }

    @Transactional
    public List<ShopTrialCampaign> createCampaigns(ShopTrialCampaignBody body, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        ShopProduct product = productService.merchantProduct(body.getProductId());
        if (!ShopProductService.ON_SALE.equals(product.getStatus()))
        {
            throw new ServiceException("只能为已上架商品创建试用招募");
        }
        if (trialMapper.lockMerchantProductForTrial(merchant.getMerchantId(), product.getProductId()) == null)
        {
            throw new ServiceException("试用商品不存在");
        }
        LinkedHashSet<String> trialTypes = new LinkedHashSet<>(body.getTrialTypes());
        for (String trialType : trialTypes)
        {
            requireTrialTypeAvailable(product.getProductId(), trialType);
        }
        List<ShopTrialCampaign> campaigns = new ArrayList<>();
        for (String trialType : trialTypes)
        {
            ShopTrialCampaign campaign = new ShopTrialCampaign();
            campaign.setMerchantId(merchant.getMerchantId());
            campaign.setProductId(product.getProductId());
            campaign.setTrialType(trialType);
            campaign.setCampaignTitle(StringUtils.trim(body.getCampaignTitle()));
            campaign.setCampaignSummary(StringUtils.trim(body.getCampaignSummary()));
            campaign.setTargetCount(body.getTargetCount());
            campaign.setApplicationDeadline(body.getApplicationDeadline());
            campaign.setStatus(RECRUITING);
            campaign.setCreateBy(operator);
            campaign.setUpdateBy(operator);
            trialMapper.insertCampaign(campaign);
            campaigns.add(merchantCampaign(campaign.getCampaignId()));
        }
        return campaigns;
    }

    @Transactional
    public ShopTrialCampaign updateCampaignStatus(long campaignId, String toStatus, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        ShopTrialCampaign campaign = requireCampaign(
                trialMapper.selectMerchantCampaign(merchant.getMerchantId(), campaignId));
        String expectedFrom;
        if (RECRUITING.equals(toStatus))
        {
            expectedFrom = DRAFT;
            if (trialMapper.lockProductForCampaign(merchant.getMerchantId(), campaignId) == null)
            {
                throw new ServiceException("试用招募不存在");
            }
            if (!campaign.getApplicationDeadline().after(new Date()))
            {
                throw new ServiceException("申请截止时间已过，不能发布招募");
            }
            ShopProduct product = productService.merchantProduct(campaign.getProductId());
            if (!ShopProductService.ON_SALE.equals(product.getStatus()))
            {
                throw new ServiceException("商品已上架时才能发布试用招募");
            }
            requireTrialTypeAvailable(campaign.getProductId(), campaign.getTrialType());
        }
        else if (CLOSED.equals(toStatus))
        {
            expectedFrom = RECRUITING;
        }
        else if (FINISHED.equals(toStatus))
        {
            expectedFrom = CLOSED;
        }
        else
        {
            throw new ServiceException("活动状态无效");
        }
        if (trialMapper.updateCampaignStatus(merchant.getMerchantId(), campaignId,
                expectedFrom, toStatus, operator) == 0)
        {
            throw new ServiceException("当前活动状态不能执行该操作");
        }
        return merchantCampaign(campaignId);
    }

    public List<ShopTrialApplication> merchantApplications(long merchantId, Long campaignId, String status)
    {
        return trialMapper.selectMerchantApplications(merchantId, campaignId, status);
    }

    @Transactional
    public ShopTrialApplication apply(long campaignId, ShopTrialApplyBody body)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopUser user = userMapper.selectById(shopUserId);
        if (user == null || !"0".equals(user.getStatus()))
        {
            throw new ServiceException("商城用户不存在或已停用");
        }
        if (!"0".equals(user.getTrialEligible()))
        {
            throw new ServiceException("当前用户暂不具备试用申请资格");
        }
        ShopTrialCampaign campaign = publicCampaign(campaignId);
        if (campaign.getApprovedCount() != null && campaign.getApprovedCount() >= campaign.getTargetCount())
        {
            throw new ServiceException("本次试用名额已满");
        }
        if (trialMapper.countUserCampaignApplication(campaignId, shopUserId) > 0)
        {
            throw new ServiceException("你已经申请过本次试用");
        }
        if (ONLINE.equals(campaign.getTrialType())
                && (StringUtils.isEmpty(StringUtils.trim(body.getRecipientName()))
                || StringUtils.isEmpty(StringUtils.trim(body.getRecipientPhone()))
                || StringUtils.isEmpty(StringUtils.trim(body.getShippingAddress()))))
        {
            throw new ServiceException("线上试用必须提供完整收货信息");
        }
        ShopTrialApplication application = new ShopTrialApplication();
        application.setCampaignId(campaignId);
        application.setShopUserId(shopUserId);
        application.setApplyReason(StringUtils.trim(body.getApplyReason()));
        application.setRecipientName(ONLINE.equals(campaign.getTrialType()) ? StringUtils.trim(body.getRecipientName()) : null);
        application.setRecipientPhone(ONLINE.equals(campaign.getTrialType()) ? StringUtils.trim(body.getRecipientPhone()) : null);
        application.setShippingAddress(ONLINE.equals(campaign.getTrialType()) ? StringUtils.trim(body.getShippingAddress()) : null);
        application.setStatus("APPLIED");
        trialMapper.insertApplication(application);
        return requireApplication(trialMapper.selectUserApplication(shopUserId, application.getApplicationId()));
    }

    public List<ShopTrialApplication> myApplications()
    {
        return trialMapper.selectUserApplications(ShopAccountIdentity.requireShopUserId());
    }

    public ShopLogisticsTrace myApplicationLogistics(long applicationId)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopTrialApplication application = requireApplication(
                trialMapper.selectUserApplication(shopUserId, applicationId));
        if (!ONLINE.equals(application.getTrialType()))
        {
            throw new ServiceException("线下试用无需查询物流");
        }
        return logisticsService.query(application.getCarrier(), application.getTrackingNo(), List.of());
    }

    @Transactional
    public ShopTrialApplication auditApplication(long applicationId, ShopTrialAuditBody body)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        if (trialMapper.lockCampaignForApplication(merchant.getMerchantId(), applicationId) == null)
        {
            throw new ServiceException("试用申请不存在");
        }
        requireApplication(trialMapper.selectMerchantApplication(merchant.getMerchantId(), applicationId));
        if ("REJECTED".equals(body.getDecision()) && StringUtils.isEmpty(StringUtils.trim(body.getAuditRemark())))
        {
            throw new ServiceException("驳回试用申请时必须填写原因");
        }
        if (trialMapper.auditApplication(merchant.getMerchantId(), applicationId,
                body.getDecision(), StringUtils.trim(body.getAuditRemark())) == 0)
        {
            throw new ServiceException("申请状态已变化或试用名额已满");
        }
        return requireApplication(trialMapper.selectMerchantApplication(merchant.getMerchantId(), applicationId));
    }

    @Transactional
    public ShopTrialApplication shipApplication(long applicationId, ShopTrialShipBody body)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        ShopTrialApplication application = requireApplication(
                trialMapper.selectMerchantApplication(merchant.getMerchantId(), applicationId));
        if (!ONLINE.equals(application.getTrialType()))
        {
            throw new ServiceException("线下试用审核通过后即可发布报告，不需要发货");
        }
        if (trialMapper.shipApplication(merchant.getMerchantId(), applicationId,
                StringUtils.trim(body.getTrackingNo())) == 0)
        {
            throw new ServiceException("只有已通过的试用申请可以发货");
        }
        return requireApplication(trialMapper.selectMerchantApplication(merchant.getMerchantId(), applicationId));
    }

    @Transactional
    public ShopTrialApplication confirmReceived(long applicationId)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopTrialApplication application = requireApplication(
                trialMapper.selectUserApplication(shopUserId, applicationId));
        if (!ONLINE.equals(application.getTrialType()))
        {
            throw new ServiceException("线下试用不需要确认收货");
        }
        if (trialMapper.confirmReceived(shopUserId, applicationId) == 0)
        {
            throw new ServiceException("只有已发货的试用可以确认收货");
        }
        return requireApplication(trialMapper.selectUserApplication(shopUserId, applicationId));
    }

    @Transactional
    public ShopVerificationReport publishReport(ShopVerificationReportBody body)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopTrialApplication application = requireApplication(
                trialMapper.selectUserApplication(shopUserId, body.getTrialApplicationId()));
        String reportReadyStatus = OFFLINE.equals(application.getTrialType()) ? "APPROVED" : "RECEIVED";
        if (!reportReadyStatus.equals(application.getStatus()))
        {
            throw new ServiceException(OFFLINE.equals(application.getTrialType())
                    ? "线下试用审核通过后才能发布验证报告"
                    : "确认收到线上试用商品后才能发布验证报告");
        }
        if (trialMapper.countReportByApplication(application.getApplicationId()) > 0)
        {
            throw new ServiceException("该试用已经发布过验证报告");
        }
        ShopVerificationReport report = new ShopVerificationReport();
        report.setProductId(application.getProductId());
        report.setTrialApplicationId(application.getApplicationId());
        report.setReportSource("TRIAL");
        report.setShopUserId(shopUserId);
        report.setExperience(StringUtils.trim(body.getExperience()));
        report.setShortcoming(StringUtils.trim(body.getShortcoming()));
        report.setFitCrowd(StringUtils.trim(body.getFitCrowd()));
        report.setRecommend(Boolean.TRUE.equals(body.getRecommend()) ? "0" : "1");
        report.setStatus("PUBLISHED");
        trialMapper.insertReport(report);
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
        if (trialMapper.completeApplication(shopUserId, application.getApplicationId(), reportReadyStatus) == 0)
        {
            throw new ServiceException("试用状态已变化，请刷新后重试");
        }
        return reportWithResources(report.getReportId(), shopUserId);
    }

    public List<ShopVerificationReport> myReports()
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        return withResources(trialMapper.selectUserReports(shopUserId), shopUserId);
    }

    public List<ShopVerificationReport> merchantReports()
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return withResources(trialMapper.selectMerchantReports(merchant.getMerchantId()), null);
    }

    public ShopVerificationReport publishedReport(long reportId)
    {
        ShopVerificationReport report = reportWithResources(reportId, ShopAccountIdentity.currentShopUserIdOrNull());
        if (!"PUBLISHED".equals(report.getStatus()))
        {
            throw new ServiceException("验证报告不存在");
        }
        return report;
    }

    @Transactional
    public ShopReportUsefulResult toggleUseful(long reportId)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopVerificationReport report = reportWithResources(reportId, shopUserId);
        if (!"PUBLISHED".equals(report.getStatus()))
        {
            throw new ServiceException("验证报告不存在");
        }
        if (Long.valueOf(shopUserId).equals(report.getShopUserId()))
        {
            throw new ServiceException("不能给自己的甄客验点有用");
        }

        if (trialMapper.deleteReportUseful(reportId, shopUserId) == 0)
        {
            trialMapper.insertReportUseful(reportId, shopUserId);
        }
        boolean usefulByMe = trialMapper.countReportUsefulByUser(reportId, shopUserId) > 0;
        return new ShopReportUsefulResult(reportId, trialMapper.countReportUseful(reportId), usefulByMe);
    }

    public List<ShopHomeFeedItem> homeFeed(String categoryCode, String contentType, String trialType)
    {
        String type = StringUtils.isEmpty(contentType) ? "ALL" : contentType.trim().toUpperCase();
        if (!type.matches("ALL|TRIAL|REPORT"))
        {
            throw new ServiceException("首页内容类型无效");
        }
        String normalizedTrialType = StringUtils.isEmpty(trialType) ? "ALL" : trialType.trim().toUpperCase();
        if (!normalizedTrialType.matches("ALL|ONLINE|OFFLINE"))
        {
            throw new ServiceException("试用方式无效");
        }
        if (!"ALL".equals(normalizedTrialType) && !"TRIAL".equals(type))
        {
            throw new ServiceException("试用方式筛选仅适用于试用招募");
        }
        String category = StringUtils.trim(categoryCode);
        if (StringUtils.isNotEmpty(category) && !category.matches("CATEGORY_[1-4]"))
        {
            throw new ServiceException("商品分类编码无效");
        }
        return trialMapper.selectHomeFeed(category, type, normalizedTrialType);
    }

    private ShopVerificationReport reportWithResources(long reportId, Long viewerShopUserId)
    {
        ShopVerificationReport report = trialMapper.selectReportById(reportId);
        if (report == null)
        {
            throw new ServiceException("验证报告不存在");
        }
        report.setResources(trialMapper.selectReportResources(reportId));
        enrichUseful(report, viewerShopUserId);
        return report;
    }

    private List<ShopVerificationReport> withResources(List<ShopVerificationReport> reports, Long viewerShopUserId)
    {
        for (ShopVerificationReport report : reports)
        {
            report.setResources(trialMapper.selectReportResources(report.getReportId()));
            enrichUseful(report, viewerShopUserId);
        }
        return reports;
    }

    private void enrichUseful(ShopVerificationReport report, Long viewerShopUserId)
    {
        report.setUsefulCount(trialMapper.countReportUseful(report.getReportId()));
        report.setUsefulByMe(viewerShopUserId != null
                && trialMapper.countReportUsefulByUser(report.getReportId(), viewerShopUserId) > 0);
    }

    private ShopTrialCampaign requireCampaign(ShopTrialCampaign campaign)
    {
        if (campaign == null)
        {
            throw new ServiceException("试用招募不存在");
        }
        return campaign;
    }

    private void requireTrialTypeAvailable(long productId, String trialType)
    {
        if (!ONLINE.equals(trialType) && !OFFLINE.equals(trialType))
        {
            throw new ServiceException("试用方式无效");
        }
        if (trialMapper.countBlockingRecruitingCampaigns(productId, trialType) > 0)
        {
            throw new ServiceException((ONLINE.equals(trialType) ? "线上" : "线下")
                    + "试用已有正在招募且名额未满的活动，可提前终止或招满后再发布新一轮");
        }
    }

    private ShopTrialApplication requireApplication(ShopTrialApplication application)
    {
        if (application == null)
        {
            throw new ServiceException("试用申请不存在");
        }
        return application;
    }
}
