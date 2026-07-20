package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.dto.ShopPurchaseReportBody;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

class ShopPurchaseReportServiceTest
{
    private static final long USER_ID = 7L;

    @Test
    void publishBindsReceivedOrderItemAndServerSideAttribution()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopTrialMapper trialMapper = mock(ShopTrialMapper.class);
        ShopTrialService trialService = mock(ShopTrialService.class);
        ShopPurchaseReportService service = new ShopPurchaseReportService(orderMapper, trialMapper, trialService);

        ShopOrderItem orderItem = new ShopOrderItem();
        orderItem.setOrderItemId(31L);
        orderItem.setProductId(10L);
        orderItem.setSourceReportId(101L);
        when(orderMapper.selectUserReceivedOrderItemForUpdate(USER_ID, 31L)).thenReturn(orderItem);
        when(trialMapper.insertReport(any())).thenAnswer(invocation -> {
            ShopVerificationReport report = invocation.getArgument(0);
            report.setReportId(201L);
            return 1;
        });
        ShopVerificationReport published = new ShopVerificationReport();
        published.setReportId(201L);
        when(trialService.publishedReport(201L)).thenReturn(published);

        ShopPurchaseReportBody body = new ShopPurchaseReportBody();
        body.setOrderItemId(31L);
        body.setExperience("这是一次真实购买后的完整使用体验，商品表现符合预期并有具体细节。");
        body.setShortcoming("包装开启方式不够方便");
        body.setFitCrowd("重视真实体验的消费者");
        body.setRecommend(true);
        body.setProductQuality(5);
        body.setLogisticsService(4);
        body.setServiceAttitude(5);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertEquals(201L, service.publish(body).getReportId());
        }

        ArgumentCaptor<ShopVerificationReport> reportCaptor = ArgumentCaptor.forClass(ShopVerificationReport.class);
        verify(trialMapper).insertReport(reportCaptor.capture());
        assertEquals("PURCHASE", reportCaptor.getValue().getReportSource());
        assertEquals(31L, reportCaptor.getValue().getOrderItemId());
        assertEquals(101L, reportCaptor.getValue().getSourceReportId());
        assertEquals(USER_ID, reportCaptor.getValue().getShopUserId());
    }

    private static MockedStatic<SecurityUtils> shopUserLogin()
    {
        LoginUser loginUser = new LoginUser(
                ShopAccountIdentity.toPrincipalId(USER_ID), null, new SysUser(),
                Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class);
        security.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        return security;
    }
}
