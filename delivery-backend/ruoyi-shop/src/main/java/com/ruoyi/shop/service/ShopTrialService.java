package com.ruoyi.shop.service;

import java.util.Date;
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

    private final ShopTrialMapper trialMapper;
    private final ShopUserMapper userMapper;
    private final ShopMerchantService merchantService;
    private final ShopProductService productService;

    public ShopTrialService(ShopTrialMapper trialMapper, ShopUserMapper userMapper,
            ShopMerchantService merchantService, ShopProductService productService)
    {
        this.trialMapper = trialMapper;
        this.userMapper = userMapper;
        this.merchantService = merchantService;
        this.productService = productService;
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
    public ShopTrialCampaign createCampaign(ShopTrialCampaignBody body, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        ShopProduct product = productService.merchantProduct(body.getProductId());
        if (!ShopProductService.ON_SALE.equals(product.getStatus()))
        {
            throw new ServiceException("只能为已上架商品创建试用招募");
        }
        ShopTrialCampaign campaign = new ShopTrialCampaign();
        campaign.setMerchantId(merchant.getMerchantId());
        campaign.setProductId(product.getProductId());
        campaign.setCampaignTitle(StringUtils.trim(body.getCampaignTitle()));
        campaign.setCampaignSummary(StringUtils.trim(body.getCampaignSummary()));
        campaign.setTargetCount(body.getTargetCount());
        campaign.setApplicationDeadline(body.getApplicationDeadline());
        campaign.setStatus(DRAFT);
        campaign.setCreateBy(operator);
        campaign.setUpdateBy(operator);
        trialMapper.insertCampaign(campaign);
        return merchantCampaign(campaign.getCampaignId());
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
            if (trialMapper.countRecruitingCampaigns(campaign.getProductId()) > 0)
            {
                throw new ServiceException("该商品已有正在招募的试用活动");
            }
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
        ShopTrialApplication application = new ShopTrialApplication();
        application.setCampaignId(campaignId);
        application.setShopUserId(shopUserId);
        application.setApplyReason(StringUtils.trim(body.getApplyReason()));
        application.setRecipientName(StringUtils.trim(body.getRecipientName()));
        application.setRecipientPhone(StringUtils.trim(body.getRecipientPhone()));
        application.setShippingAddress(StringUtils.trim(body.getShippingAddress()));
        application.setStatus("APPLIED");
        trialMapper.insertApplication(application);
        return requireApplication(trialMapper.selectUserApplication(shopUserId, application.getApplicationId()));
    }

    public List<ShopTrialApplication> myApplications()
    {
        return trialMapper.selectUserApplications(ShopAccountIdentity.requireShopUserId());
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
        requireApplication(trialMapper.selectMerchantApplication(merchant.getMerchantId(), applicationId));
        if (trialMapper.shipApplication(merchant.getMerchantId(), applicationId,
                StringUtils.trim(body.getCarrier()), StringUtils.trim(body.getTrackingNo())) == 0)
        {
            throw new ServiceException("只有已通过的试用申请可以发货");
        }
        return requireApplication(trialMapper.selectMerchantApplication(merchant.getMerchantId(), applicationId));
    }

    @Transactional
    public ShopTrialApplication confirmReceived(long applicationId)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        requireApplication(trialMapper.selectUserApplication(shopUserId, applicationId));
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
        if (!"RECEIVED".equals(application.getStatus()))
        {
            throw new ServiceException("确认收到试用商品后才能发布验证报告");
        }
        if (trialMapper.countReportByApplication(application.getApplicationId()) > 0)
        {
            throw new ServiceException("该试用已经发布过验证报告");
        }
        ShopVerificationReport report = new ShopVerificationReport();
        report.setProductId(application.getProductId());
        report.setTrialApplicationId(application.getApplicationId());
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
        if (trialMapper.completeApplication(shopUserId, application.getApplicationId()) == 0)
        {
            throw new ServiceException("试用状态已变化，请刷新后重试");
        }
        return reportWithResources(report.getReportId());
    }

    public List<ShopVerificationReport> myReports()
    {
        return withResources(trialMapper.selectUserReports(ShopAccountIdentity.requireShopUserId()));
    }

    public List<ShopVerificationReport> merchantReports()
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return withResources(trialMapper.selectMerchantReports(merchant.getMerchantId()));
    }

    public ShopVerificationReport publishedReport(long reportId)
    {
        ShopVerificationReport report = reportWithResources(reportId);
        if (!"PUBLISHED".equals(report.getStatus()))
        {
            throw new ServiceException("验证报告不存在");
        }
        return report;
    }

    public List<ShopHomeFeedItem> homeFeed(String categoryCode, String contentType)
    {
        String type = StringUtils.isEmpty(contentType) ? "ALL" : contentType.trim().toUpperCase();
        if (!type.matches("ALL|TRIAL|REPORT"))
        {
            throw new ServiceException("首页内容类型无效");
        }
        String category = StringUtils.trim(categoryCode);
        if (StringUtils.isNotEmpty(category) && !category.matches("CATEGORY_[1-4]"))
        {
            throw new ServiceException("商品分类编码无效");
        }
        return trialMapper.selectHomeFeed(category, type);
    }

    private ShopVerificationReport reportWithResources(long reportId)
    {
        ShopVerificationReport report = trialMapper.selectReportById(reportId);
        if (report == null)
        {
            throw new ServiceException("验证报告不存在");
        }
        report.setResources(trialMapper.selectReportResources(reportId));
        return report;
    }

    private List<ShopVerificationReport> withResources(List<ShopVerificationReport> reports)
    {
        for (ShopVerificationReport report : reports)
        {
            report.setResources(trialMapper.selectReportResources(report.getReportId()));
        }
        return reports;
    }

    private ShopTrialCampaign requireCampaign(ShopTrialCampaign campaign)
    {
        if (campaign == null)
        {
            throw new ServiceException("试用招募不存在");
        }
        return campaign;
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
