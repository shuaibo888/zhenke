package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import com.github.pagehelper.PageHelper;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopTrialApplication;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.dto.ShopVerificationReportBody;
import com.ruoyi.shop.domain.dto.ShopVerificationResourceBody;
import com.ruoyi.shop.logistics.AliyunLogisticsService;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopUserMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

class ShopTrialReportPersistenceTest
{
    private final ShopTrialMapper trialMapper = mock(ShopTrialMapper.class);
    private final ShopReportResourceService resourceService = mock(ShopReportResourceService.class);
    private final ShopNotificationService notificationService = mock(ShopNotificationService.class);
    private final ShopTrialService service = new ShopTrialService(
            trialMapper,
            mock(ShopUserMapper.class),
            mock(ShopMerchantService.class),
            mock(ShopProductService.class),
            mock(AliyunLogisticsService.class),
            resourceService,
            notificationService);

    @AfterEach
    void clearSecurityContext()
    {
        SecurityContextHolder.clearContext();
        PageHelper.clearPage();
    }

    @Test
    void mediaWriteFailureDoesNotCompleteTheTrialReportFlow()
    {
        authenticateShopUser(18L);
        ShopTrialApplication application = new ShopTrialApplication();
        application.setApplicationId(91L);
        application.setProductId(12L);
        application.setTrialType(ShopTrialService.ONLINE);
        application.setStatus("RECEIVED");
        when(trialMapper.selectUserApplication(18L, 91L)).thenReturn(application);
        when(trialMapper.countReportByApplication(91L)).thenReturn(0);
        when(trialMapper.insertReport(any(ShopVerificationReport.class))).thenAnswer(invocation -> {
            ShopVerificationReport report = invocation.getArgument(0);
            report.setReportId(66L);
            return 1;
        });
        when(resourceService.normalizeOwnedResourceUrl(
                18L, "IMAGE", "/profile/upload/report/photo.png"))
                .thenReturn("/profile/upload/report/user-18/photo.png");
        when(trialMapper.insertReportResource(any())).thenReturn(0);

        assertThrows(ServiceException.class, () -> service.publishReport(reportBody()));

        verify(trialMapper, never()).completeApplication(anyLong(), anyLong(), any());
    }

    @Test
    void mallContentFeedKeepsOriginalCommerceCategoriesSeparate()
    {
        when(trialMapper.selectHomeFeed(null, null, "ALL", "ALL", true, null, null))
                .thenReturn(List.of());

        service.homeFeed(null, null, "MALL", "ALL", "ALL", null, 1, 8);

        verify(trialMapper).selectHomeFeed(null, null, "ALL", "ALL", true, null, null);
    }

    @Test
    void localLifeStableCategoryCanDriveTheCommerceContentFeed()
    {
        when(trialMapper.selectHomeFeed(
                null, "ZHENKE_HOTEL", "ALL", "ALL", false, null, null))
                .thenReturn(List.of());

        service.homeFeed(null, "ZHENKE_HOTEL", null, "ALL", "ALL", null, 1, 8);

        verify(trialMapper).selectHomeFeed(
                null, "ZHENKE_HOTEL", "ALL", "ALL", false, null, null);
    }

    @Test
    void activatingReportUsefulCreatesOneNotificationWhileRemovingItDoesNot()
    {
        authenticateShopUser(18L);
        ShopVerificationReport report = new ShopVerificationReport();
        report.setReportId(66L);
        report.setShopUserId(27L);
        report.setStatus("PUBLISHED");
        when(trialMapper.selectReportById(66L)).thenReturn(report);
        when(trialMapper.selectReportResources(66L)).thenReturn(List.of());
        when(trialMapper.deleteReportUseful(66L, 18L)).thenReturn(0, 1);
        when(trialMapper.countReportUsefulByUser(66L, 18L)).thenReturn(0, 1, 1, 0);

        service.toggleUseful(66L);
        service.toggleUseful(66L);

        verify(notificationService, times(1)).reportUseful(report, 18L);
    }

    private ShopVerificationReportBody reportBody()
    {
        ShopVerificationResourceBody image = new ShopVerificationResourceBody();
        image.setResourceType("IMAGE");
        image.setResourceUrl("/profile/upload/report/photo.png");
        ShopVerificationReportBody body = new ShopVerificationReportBody();
        body.setTrialApplicationId(91L);
        body.setTitle("一次真实试用体验");
        body.setExperience("这是一段超过二十个字符的真实试用体验内容，用于验证媒体失败时事务必须回滚。");
        body.setShortcoming("高峰时段的服务提示还可以更清楚一些");
        body.setRecommend(true);
        body.setResources(List.of(image));
        return body;
    }

    private void authenticateShopUser(long userId)
    {
        SysUser user = new SysUser();
        user.setPhonenumber("13800000000");
        LoginUser principal = new LoginUser(
                ShopAccountIdentity.toPrincipalId(userId),
                null,
                user,
                Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
