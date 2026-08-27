package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.dto.ShopPurchaseReportBody;
import com.ruoyi.shop.domain.dto.ShopVerificationResourceBody;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopPurchaseReportServiceTest {
  private final ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
  private final ShopTrialMapper trialMapper = mock(ShopTrialMapper.class);
  private final ShopTrialService trialService = mock(ShopTrialService.class);
  private final ShopPurchaseReportService service =
      new ShopPurchaseReportService(orderMapper, trialMapper, trialService);

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void redeemedOfflineOrderItemCanCreatePurchaseVerificationReport() {
    authenticateShopUser(18L);
    ShopOrderItem eligibleItem = new ShopOrderItem();
    eligibleItem.setOrderItemId(91L);
    eligibleItem.setProductId(12L);
    when(orderMapper.selectUserReceivedOrderItemForUpdate(18L, 91L)).thenReturn(eligibleItem);
    when(trialMapper.countReportByOrderItem(91L)).thenReturn(0);
    when(trialMapper.insertReport(any(ShopVerificationReport.class)))
        .thenAnswer(
            invocation -> {
              ((ShopVerificationReport) invocation.getArgument(0)).setReportId(66L);
              return 1;
            });
    when(trialMapper.insertReportResource(any())).thenReturn(1);
    ShopVerificationReport published = new ShopVerificationReport();
    published.setReportId(66L);
    when(trialService.publishedReport(66L)).thenReturn(published);

    ShopVerificationReport result = service.publish(reportBody());

    assertEquals(66L, result.getReportId());
    verify(orderMapper).selectUserReceivedOrderItemForUpdate(18L, 91L);
    verify(trialMapper).insertReport(any(ShopVerificationReport.class));
  }

  @Test
  void orderItemWithoutReceivedOrRedeemedQualificationIsRejected() {
    authenticateShopUser(18L);
    when(orderMapper.selectUserReceivedOrderItemForUpdate(18L, 91L)).thenReturn(null);

    assertThrows(ServiceException.class, () -> service.publish(reportBody()));
    verify(trialMapper, never()).insertReport(any());
  }

  private ShopPurchaseReportBody reportBody() {
    ShopVerificationResourceBody image = new ShopVerificationResourceBody();
    image.setResourceType("IMAGE");
    image.setResourceUrl("/profile/upload/report/photo.png");
    ShopPurchaseReportBody body = new ShopPurchaseReportBody();
    body.setOrderItemId(91L);
    body.setTitle("一次真实消费体验");
    body.setExperience("这是一段超过二十个字符的真实消费体验内容，用于验证核销后的甄客验资格。");
    body.setShortcoming("高峰时段的等候提示还可以更清楚一些");
    body.setRecommend(true);
    body.setProductQuality(5);
    body.setLogisticsService(5);
    body.setServiceAttitude(5);
    body.setResources(List.of(image));
    return body;
  }

  private void authenticateShopUser(long userId) {
    SysUser user = new SysUser();
    user.setPhonenumber("13800000000");
    LoginUser principal =
        new LoginUser(
            ShopAccountIdentity.toPrincipalId(userId),
            null,
            user,
            Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
  }
}
