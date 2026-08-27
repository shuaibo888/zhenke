package com.ruoyi.shop.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopTrialApplication;
import com.ruoyi.shop.domain.ShopTrialCampaign;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportResource;
import com.ruoyi.shop.domain.vo.ShopHomeFeedItem;

public interface ShopTrialMapper {
    List<ShopTrialCampaign> selectMerchantCampaigns(@Param("merchantId") Long merchantId,
                                                    @Param("query") ShopTrialCampaign query);

    List<ShopTrialCampaign> selectAdminCampaigns(ShopTrialCampaign query);

    ShopTrialCampaign selectAdminCampaign(Long campaignId);

    ShopTrialCampaign selectMerchantCampaign(@Param("merchantId") Long merchantId,
                                             @Param("campaignId") Long campaignId);

    ShopTrialCampaign selectPublicCampaign(Long campaignId);

    int countBlockingRecruitingCampaigns(@Param("productId") Long productId,
                                         @Param("trialType") String trialType);

    int insertCampaign(ShopTrialCampaign campaign);

    int updateCampaignStatus(@Param("merchantId") Long merchantId, @Param("campaignId") Long campaignId,
                             @Param("fromStatus") String fromStatus, @Param("toStatus") String toStatus,
                             @Param("updateBy") String updateBy);

    int expirePendingApplicationsForEndedCampaigns();

    int closeEndedCampaigns();

    Long lockProductForCampaign(@Param("merchantId") Long merchantId, @Param("campaignId") Long campaignId);

    Long lockMerchantProductForTrial(@Param("merchantId") Long merchantId, @Param("productId") Long productId);

    List<ShopTrialApplication> selectMerchantApplications(@Param("merchantId") Long merchantId,
                                                          @Param("campaignId") Long campaignId, @Param("status") String status);

    List<ShopTrialApplication> selectAdminApplications(@Param("campaignId") Long campaignId,
                                                        @Param("status") String status);

    ShopTrialApplication selectAdminApplication(Long applicationId);

    ShopTrialApplication selectMerchantApplication(@Param("merchantId") Long merchantId,
                                                   @Param("applicationId") Long applicationId);

    List<ShopTrialApplication> selectUserApplications(Long shopUserId);
    int countUserApplications(Long shopUserId);

    ShopTrialApplication selectUserApplication(@Param("shopUserId") Long shopUserId,
                                               @Param("applicationId") Long applicationId);

    int countUserCampaignApplication(@Param("campaignId") Long campaignId, @Param("shopUserId") Long shopUserId);

    Long lockCampaignForApplication(@Param("merchantId") Long merchantId,
                                    @Param("applicationId") Long applicationId);

    int insertApplication(ShopTrialApplication application);

    int auditApplication(@Param("merchantId") Long merchantId, @Param("applicationId") Long applicationId,
                         @Param("decision") String decision, @Param("auditRemark") String auditRemark);

    int shipApplication(@Param("merchantId") Long merchantId, @Param("applicationId") Long applicationId,
                        @Param("trackingNo") String trackingNo);

    int confirmReceived(@Param("shopUserId") Long shopUserId, @Param("applicationId") Long applicationId);

    int completeApplication(@Param("shopUserId") Long shopUserId, @Param("applicationId") Long applicationId,
                            @Param("expectedStatus") String expectedStatus);

    int updateRedeemCode(@Param("shopUserId") Long shopUserId, @Param("applicationId") Long applicationId,
                         @Param("redeemCode") String redeemCode);

    int redeemApplication(@Param("merchantId") Long merchantId, @Param("redeemCode") String redeemCode);

    ShopTrialApplication selectMerchantApplicationByRedeemCode(@Param("merchantId") Long merchantId,
                                                               @Param("redeemCode") String redeemCode);

    ShopTrialApplication selectAdminApplicationByRedeemCode(String redeemCode);

    int countReportByApplication(Long trialApplicationId);

    int countReportByOrderItem(Long orderItemId);

    int insertReport(ShopVerificationReport report);

    int insertReportResource(ShopVerificationReportResource resource);

    List<ShopVerificationReportResource> selectReportResources(Long reportId);

    ShopVerificationReport selectReportById(Long reportId);

    List<ShopVerificationReport> selectUserReports(Long shopUserId);

    List<ShopVerificationReport> selectMerchantReports(Long merchantId);

    List<ShopVerificationReport> selectAdminReports();

    int logicalDeleteReport(@Param("reportId") Long reportId, @Param("deletedBy") Long deletedBy,
                            @Param("deletedByName") String deletedByName);

    int countReportUseful(Long reportId);

    int countReportUsefulByUser(@Param("reportId") Long reportId, @Param("shopUserId") Long shopUserId);

    int insertReportUseful(@Param("reportId") Long reportId, @Param("shopUserId") Long shopUserId);

    int deleteReportUseful(@Param("reportId") Long reportId, @Param("shopUserId") Long shopUserId);

    int countPublishedReportsByUser(Long shopUserId);

    int countUsefulReceivedByUser(Long shopUserId);

    List<ShopHomeFeedItem> selectHomeFeed(@Param("productId") Long productId,
                                          @Param("categoryCode") String categoryCode,
                                          @Param("contentType") String contentType, @Param("trialType") String trialType,
                                          @Param("mallOnly") boolean mallOnly,
                                          @Param("viewerShopUserId") Long viewerShopUserId,
                                          @Param("keyword") String keyword);
}
