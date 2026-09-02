package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.pagehelper.PageHelper;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.vo.ShopPointBalance;
import com.ruoyi.shop.domain.vo.ShopUsefulContentView;
import com.ruoyi.shop.mapper.ShopCouponMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopZhenkeMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopUserOverviewServiceTest {
  private final ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
  private final ShopTrialMapper trialMapper = mock(ShopTrialMapper.class);
  private final ShopZhenkeMapper zhenkeMapper = mock(ShopZhenkeMapper.class);
  private final ShopCouponMapper couponMapper = mock(ShopCouponMapper.class);
  private final ShopPointService pointService = mock(ShopPointService.class);
  private final ShopPublicMediaService publicMedia = mock(ShopPublicMediaService.class);
  private final ShopUserOverviewService service = new ShopUserOverviewService(
      orderMapper, trialMapper, zhenkeMapper, couponMapper, pointService, publicMedia);

  @AfterEach
  void cleanUp() {
    SecurityContextHolder.clearContext();
    PageHelper.clearPage();
  }

  @Test
  void overviewSeparatesPostAndReportUsefulCountsAndReturnsTheirTotal() {
    authenticateShopUser(18L);
    when(orderMapper.countUserOrders(18L)).thenReturn(2);
    when(trialMapper.countUserApplications(18L)).thenReturn(3);
    when(trialMapper.countPublishedReportsByUser(18L)).thenReturn(4);
    when(couponMapper.countAvailableUserCoupons(18L)).thenReturn(1);
    when(zhenkeMapper.countUsefulReceivedByAuthor(18L)).thenReturn(5);
    when(trialMapper.countUsefulReceivedByUser(18L)).thenReturn(7);
    ShopPointBalance points = new ShopPointBalance();
    points.setBalance(40L);
    when(pointService.mySummary()).thenReturn(points);

    var result = service.overview();

    assertEquals(5L, result.getPostUsefulReceivedCount());
    assertEquals(7L, result.getReportUsefulReceivedCount());
    assertEquals(12L, result.getTotalUsefulReceivedCount());
  }

  @Test
  void usefulContentRoutesByTypeAndConvertsOnlyTheReturnedPageCoverUrls() {
    authenticateShopUser(18L);
    ShopUsefulContentView post = new ShopUsefulContentView();
    post.setCoverUrl("/profile/upload/post.jpg");
    when(zhenkeMapper.selectUsefulContentByAuthor(18L)).thenReturn(List.of(post));
    when(publicMedia.publicUrl("/profile/upload/post.jpg")).thenReturn("https://cdn/post.jpg");

    List<ShopUsefulContentView> result = service.usefulContent(" post ", 0, 500);

    assertEquals("https://cdn/post.jpg", result.get(0).getCoverUrl());
    verify(zhenkeMapper).selectUsefulContentByAuthor(18L);
    verify(trialMapper, never()).selectUsefulContentByUser(18L);
    assertThrows(ServiceException.class, () -> service.usefulContent("ENJOY", 1, 12));
  }

  @Test
  void usefulContentSupportsPublishedReportPagesIndependentlyFromPosts() {
    authenticateShopUser(18L);
    ShopUsefulContentView report = new ShopUsefulContentView();
    report.setContentType("REPORT");
    report.setCoverUrl("/profile/upload/report.jpg");
    when(trialMapper.selectUsefulContentByUser(18L)).thenReturn(List.of(report));
    when(publicMedia.publicUrl("/profile/upload/report.jpg")).thenReturn("https://cdn/report.jpg");

    List<ShopUsefulContentView> result = service.usefulContent("REPORT", 1, 12);

    assertEquals("REPORT", result.get(0).getContentType());
    assertEquals("https://cdn/report.jpg", result.get(0).getCoverUrl());
    verify(trialMapper).selectUsefulContentByUser(18L);
    verify(zhenkeMapper, never()).selectUsefulContentByAuthor(18L);
  }

  private void authenticateShopUser(long userId) {
    SysUser user = new SysUser();
    user.setPhonenumber("13800000000");
    LoginUser principal = new LoginUser(
        ShopAccountIdentity.toPrincipalId(userId), null, user,
        Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
  }
}
