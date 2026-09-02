package com.ruoyi.shop.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.time.LocalDate;
import java.time.ZoneId;
import com.github.pagehelper.PageHelper;
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
    public static final String PENDING_REDEMPTION = "PENDING_REDEMPTION";
    public static final String REDEEMED = "REDEEMED";

    private final ShopTrialMapper trialMapper;
    private final ShopUserMapper userMapper;
    private final ShopMerchantService merchantService;
    private final ShopProductService productService;
    private final AliyunLogisticsService logisticsService;
    private final ShopReportResourceService resourceService;
    private final ShopNotificationService notificationService;

    public ShopTrialService(ShopTrialMapper trialMapper, ShopUserMapper userMapper,
            ShopMerchantService merchantService, ShopProductService productService,
            AliyunLogisticsService logisticsService, ShopReportResourceService resourceService,
            ShopNotificationService notificationService)
    {
        this.trialMapper = trialMapper;
        this.userMapper = userMapper;
        this.merchantService = merchantService;
        this.productService = productService;
        this.logisticsService = logisticsService;
        this.resourceService = resourceService;
        this.notificationService = notificationService;
    }

    public List<ShopTrialCampaign> merchantCampaigns(long merchantId, ShopTrialCampaign query)
    {
        return trialMapper.selectMerchantCampaigns(merchantId, query);
    }

    public List<ShopTrialCampaign> adminCampaigns(ShopTrialCampaign query)
    {
        return trialMapper.selectAdminCampaigns(query);
    }

    public ShopTrialCampaign adminCampaign(long campaignId)
    {
        return requireCampaign(trialMapper.selectAdminCampaign(campaignId));
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

    public List<String> availableTrialTypes(long productId)
    {
        productService.merchantProduct(productId);
        List<String> available = new ArrayList<>();
        if (trialMapper.countBlockingRecruitingCampaigns(productId, ONLINE) == 0)
        {
            available.add(ONLINE);
        }
        if (trialMapper.countBlockingRecruitingCampaigns(productId, OFFLINE) == 0)
        {
            available.add(OFFLINE);
        }
        return available;
    }

    @Transactional
    public List<ShopTrialCampaign> createCampaigns(ShopTrialCampaignBody body, String operator)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        if (isBeforeToday(body.getApplicationDeadline()))
        {
            throw new ServiceException("申请截止日期不能早于今天");
        }
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
        return updateCampaignStatusForMerchant(merchant.getMerchantId(), campaignId, toStatus, operator, false);
    }

    @Transactional
    public ShopTrialCampaign adminUpdateCampaignStatus(long campaignId, String toStatus, String operator)
    {
        if (RECRUITING.equals(toStatus))
        {
            throw new ServiceException("管理员不能代商家发布试用招募");
        }
        ShopTrialCampaign campaign = adminCampaign(campaignId);
        return updateCampaignStatusForMerchant(campaign.getMerchantId(), campaignId, toStatus, operator, true);
    }

    private ShopTrialCampaign updateCampaignStatusForMerchant(long merchantId, long campaignId,
            String toStatus, String operator, boolean adminOperation)
    {
        ShopTrialCampaign campaign = requireCampaign(
                trialMapper.selectMerchantCampaign(merchantId, campaignId));
        String expectedFrom;
        if (RECRUITING.equals(toStatus))
        {
            expectedFrom = DRAFT;
            if (trialMapper.lockProductForCampaign(merchantId, campaignId) == null)
            {
                throw new ServiceException("试用招募不存在");
            }
            if (isBeforeToday(campaign.getApplicationDeadline()))
            {
                throw new ServiceException("申请截止日期已过，不能发布招募");
            }
            ShopProduct product = adminOperation ? productService.adminProduct(campaign.getProductId())
                    : productService.merchantProduct(campaign.getProductId());
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
        if (trialMapper.updateCampaignStatus(merchantId, campaignId,
                expectedFrom, toStatus, operator) == 0)
        {
            throw new ServiceException("当前活动状态不能执行该操作");
        }
        return adminOperation ? adminCampaign(campaignId)
                : requireCampaign(trialMapper.selectMerchantCampaign(merchantId, campaignId));
    }

    public List<ShopTrialApplication> merchantApplications(long merchantId, Long campaignId, String status)
    {
        return trialMapper.selectMerchantApplications(merchantId, campaignId, status);
    }

    public List<ShopTrialApplication> adminApplications(Long campaignId, String status)
    {
        return trialMapper.selectAdminApplications(campaignId, status);
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

    public ShopTrialApplication myApplication(long applicationId)
    {
        return requireApplication(trialMapper.selectUserApplication(
                ShopAccountIdentity.requireShopUserId(), applicationId));
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
        return auditApplicationForMerchant(merchant.getMerchantId(), applicationId, body);
    }

    @Transactional
    public ShopTrialApplication adminAuditApplication(long applicationId, ShopTrialAuditBody body)
    {
        ShopTrialApplication application = requireApplication(trialMapper.selectAdminApplication(applicationId));
        return auditApplicationForMerchant(application.getMerchantId(), applicationId, body);
    }

    private ShopTrialApplication auditApplicationForMerchant(long merchantId, long applicationId,
            ShopTrialAuditBody body)
    {
        if (trialMapper.lockCampaignForApplication(merchantId, applicationId) == null)
        {
            throw new ServiceException("试用申请不存在");
        }
        requireApplication(trialMapper.selectMerchantApplication(merchantId, applicationId));
        if ("REJECTED".equals(body.getDecision()) && StringUtils.isEmpty(StringUtils.trim(body.getAuditRemark())))
        {
            throw new ServiceException("驳回试用申请时必须填写原因");
        }
        if (trialMapper.auditApplication(merchantId, applicationId,
                body.getDecision(), StringUtils.trim(body.getAuditRemark())) == 0)
        {
            throw new ServiceException("申请状态已变化或试用名额已满");
        }
        if ("APPROVED".equals(body.getDecision()))
        {
            closeEndedRecruitingCampaigns();
        }
        return requireApplication(trialMapper.selectMerchantApplication(merchantId, applicationId));
    }

    @Transactional
    public int closeEndedRecruitingCampaigns()
    {
        int expiredApplications = trialMapper.expirePendingApplicationsForEndedCampaigns();
        int closedCampaigns = trialMapper.closeEndedCampaigns();
        return expiredApplications + closedCampaigns;
    }

    @Transactional
    public ShopTrialApplication shipApplication(long applicationId, ShopTrialShipBody body)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return shipApplicationForMerchant(merchant.getMerchantId(), applicationId, body);
    }

    @Transactional
    public ShopTrialApplication adminShipApplication(long applicationId, ShopTrialShipBody body)
    {
        ShopTrialApplication application = requireApplication(trialMapper.selectAdminApplication(applicationId));
        return shipApplicationForMerchant(application.getMerchantId(), applicationId, body);
    }

    private ShopTrialApplication shipApplicationForMerchant(long merchantId, long applicationId,
            ShopTrialShipBody body)
    {
        ShopTrialApplication application = requireApplication(
                trialMapper.selectMerchantApplication(merchantId, applicationId));
        if (!ONLINE.equals(application.getTrialType()))
        {
            throw new ServiceException("线下试用审核通过后即可发布报告，不需要发货");
        }
        if (trialMapper.shipApplication(merchantId, applicationId,
                StringUtils.trim(body.getTrackingNo())) == 0)
        {
            throw new ServiceException("只有已通过的试用申请可以发货");
        }
        return requireApplication(trialMapper.selectMerchantApplication(merchantId, applicationId));
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
    public ShopTrialApplication getOrCreateRedeemCode(long applicationId)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopTrialApplication application = requireApplication(
                trialMapper.selectUserApplication(shopUserId, applicationId));
        if (!OFFLINE.equals(application.getTrialType()))
        {
            throw new ServiceException("线下试用才能出示核销码");
        }
        if (PENDING_REDEMPTION.equals(application.getStatus()))
        {
            if (StringUtils.isEmpty(application.getRedeemCode()))
            {
                String redeemCode = UUID.randomUUID().toString().replace("-", "");
                trialMapper.updateRedeemCode(shopUserId, applicationId, redeemCode);
                application = requireApplication(trialMapper.selectUserApplication(shopUserId, applicationId));
                if (StringUtils.isEmpty(application.getRedeemCode()))
                {
                    throw new ServiceException("当前状态不能出示核销码");
                }
            }
            return application;
        }
        if (REDEEMED.equals(application.getStatus()) || "COMPLETED".equals(application.getStatus()))
        {
            // 已核销/已完成后返回最新状态，供用户端轮询识别核销成功并结束出示流程
            return application;
        }
        throw new ServiceException("当前状态不能出示核销码");
    }

    @Transactional
    public ShopTrialApplication redeemApplication(String redeemCode)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return redeemApplicationForMerchant(merchant.getMerchantId(), redeemCode);
    }

    public ShopTrialApplication previewRedeemApplication(String redeemCode)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return previewRedeemApplicationForMerchant(merchant.getMerchantId(), redeemCode);
    }

    @Transactional
    public ShopTrialApplication adminRedeemApplication(String redeemCode)
    {
        String normalized = StringUtils.trim(redeemCode);
        ShopTrialApplication application = requireApplication(
                trialMapper.selectAdminApplicationByRedeemCode(normalized));
        return redeemApplicationForMerchant(application.getMerchantId(), normalized);
    }

    public ShopTrialApplication adminPreviewRedeemApplication(String redeemCode)
    {
        String normalized = StringUtils.trim(redeemCode);
        ShopTrialApplication application = requireApplication(
                trialMapper.selectAdminApplicationByRedeemCode(normalized));
        return previewRedeemApplicationForMerchant(application.getMerchantId(), normalized);
    }

    private ShopTrialApplication previewRedeemApplicationForMerchant(long merchantId, String redeemCode)
    {
        String normalized = StringUtils.trim(redeemCode);
        if (StringUtils.isEmpty(normalized))
        {
            throw new ServiceException("核销码不能为空");
        }
        ShopTrialApplication application = trialMapper.selectMerchantApplicationByRedeemCode(
                merchantId, normalized);
        if (application == null)
        {
            throw new ServiceException("核销码无效或不属于当前商家");
        }
        if (!OFFLINE.equals(application.getTrialType()) || !PENDING_REDEMPTION.equals(application.getStatus()))
        {
            throw new ServiceException("该试用申请当前不能核销");
        }
        return application;
    }

    private ShopTrialApplication redeemApplicationForMerchant(long merchantId, String redeemCode)
    {
        String normalized = StringUtils.trim(redeemCode);
        if (StringUtils.isEmpty(normalized))
        {
            throw new ServiceException("核销码不能为空");
        }
        if (trialMapper.redeemApplication(merchantId, normalized) == 0)
        {
            throw new ServiceException("核销码无效或不属于当前商家");
        }
        return requireApplication(
                trialMapper.selectMerchantApplicationByRedeemCode(merchantId, normalized));
    }

    @Transactional
    public ShopVerificationReport publishReport(ShopVerificationReportBody body)
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
        ShopTrialApplication application = requireApplication(
                trialMapper.selectUserApplication(shopUserId, body.getTrialApplicationId()));
        String reportReadyStatus = OFFLINE.equals(application.getTrialType()) ? REDEEMED : "RECEIVED";
        if (!reportReadyStatus.equals(application.getStatus()))
        {
            throw new ServiceException(OFFLINE.equals(application.getTrialType())
                    ? "线下试用核销后才能发布验证报告"
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
        report.setTitle(StringUtils.trim(body.getTitle()));
        report.setExperience(StringUtils.trim(body.getExperience()));
        report.setShortcoming(StringUtils.trim(body.getShortcoming()));
        report.setFitCrowd("");
        report.setRecommend(Boolean.TRUE.equals(body.getRecommend()) ? "0" : "1");
        report.setStatus("PUBLISHED");
        if (trialMapper.insertReport(report) != 1)
        {
            throw new ServiceException("验证报告发布失败");
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

    public List<ShopVerificationReport> merchantReports(long merchantId)
    {
        return withResources(trialMapper.selectMerchantReports(merchantId), null);
    }

    public List<ShopVerificationReport> adminReports()
    {
        return withResources(trialMapper.selectAdminReports(), null);
    }

    @Transactional
    public ShopVerificationReport adminDeleteReport(long reportId, long adminUserId, String operator)
    {
        ShopVerificationReport report = reportWithResources(reportId, null);
        if (!"PUBLISHED".equals(report.getStatus()))
        {
            throw new ServiceException("甄客验已经删除");
        }
        if (trialMapper.logicalDeleteReport(reportId, adminUserId, operator) == 0)
        {
            throw new ServiceException("甄客验状态已变化，请刷新后重试");
        }
        return reportWithResources(reportId, null);
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

        boolean activating = trialMapper.deleteReportUseful(reportId, shopUserId) == 0;
        if (activating)
        {
            trialMapper.insertReportUseful(reportId, shopUserId);
        }
        boolean usefulByMe = trialMapper.countReportUsefulByUser(reportId, shopUserId) > 0;
        if (activating && usefulByMe)
        {
            notificationService.reportUseful(report, shopUserId);
        }
        return new ShopReportUsefulResult(reportId, trialMapper.countReportUseful(reportId), usefulByMe);
    }

    public List<ShopHomeFeedItem> homeFeed(Long productId, String categoryCode, String businessModule,
                                           String contentType, String trialType, String keyword,
                                           int pageNum, int pageSize)
    {
        if (productId != null && productId <= 0)
        {
            throw new ServiceException("商品编号无效");
        }
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
        if (StringUtils.isNotEmpty(category)
                && !category.matches("CATEGORY_[A-Za-z0-9_-]{1,23}")
                && !ShopProductService.LOCAL_LIFE_CATEGORY_CODES.contains(category))
        {
            throw new ServiceException("商品分类编码无效");
        }
        category = StringUtils.isEmpty(category) ? null : category;
        String module = StringUtils.trim(businessModule);
        if (StringUtils.isNotEmpty(module) && !"MALL".equalsIgnoreCase(module))
        {
            throw new ServiceException("营业模块参数无效");
        }
        boolean mallOnly = "MALL".equalsIgnoreCase(module);
        String normalizedKeyword = StringUtils.trim(keyword);
        if (StringUtils.isNotEmpty(normalizedKeyword) && normalizedKeyword.length() > 50)
        {
            throw new ServiceException("搜索关键词不能超过50个字符");
        }
        int safePageNum = Math.max(pageNum, 1);
        int safePageSize = Math.max(1, Math.min(pageSize, 24));
        PageHelper.startPage(safePageNum, safePageSize);
        return trialMapper.selectHomeFeed(
                productId,
                category,
                type,
                normalizedTrialType,
                mallOnly,
                ShopAccountIdentity.currentShopUserIdOrNull(),
                StringUtils.isEmpty(normalizedKeyword) ? null : normalizedKeyword);
    }

    public List<ShopHomeFeedItem> searchHomeFeed(String keyword, int pageNum, int pageSize)
    {
        String normalizedKeyword = StringUtils.trim(keyword);
        if (StringUtils.isEmpty(normalizedKeyword))
        {
            throw new ServiceException("请输入搜索关键词");
        }
        if (normalizedKeyword.length() > 50)
        {
            throw new ServiceException("搜索关键词不能超过50个字符");
        }
        int safePageNum = Math.max(pageNum, 1);
        int safePageSize = Math.max(1, Math.min(pageSize, 24));
        PageHelper.startPage(safePageNum, safePageSize);
        return trialMapper.selectHomeFeed(
                null,
                null,
                "ALL",
                "ALL",
                false,
                ShopAccountIdentity.currentShopUserIdOrNull(),
                normalizedKeyword);
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

    private boolean isBeforeToday(java.util.Date value)
    {
        LocalDate deadline = value.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        return deadline.isBefore(LocalDate.now(ZoneId.systemDefault()));
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
