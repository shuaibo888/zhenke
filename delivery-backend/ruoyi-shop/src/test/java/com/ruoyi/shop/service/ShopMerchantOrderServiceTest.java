package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderStatusLog;
import com.ruoyi.shop.logistics.AliyunLogisticsService;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ShopMerchantOrderServiceTest {
  private final ShopOrderMapper mapper = mock(ShopOrderMapper.class);
  private final ShopMerchantService merchantService = mock(ShopMerchantService.class);
  private final ShopMerchantOrderService service =
      new ShopMerchantOrderService(
          mapper, merchantService, mock(AliyunLogisticsService.class));

  @Test
  void merchantRedeemIsScopedToCurrentMerchantAndWritesAuditLog() {
    authenticateMerchant(7L);
    ShopOrder redeemed = order(31L, 7L, ShopOrderService.RECEIVED, "OFFLINE");
    when(mapper.redeemOrder(7L, "valid-code")).thenReturn(1);
    when(mapper.selectMerchantOrderByRedeemCode(7L, "valid-code")).thenReturn(redeemed);
    when(mapper.insertStatusLog(any())).thenReturn(1);

    ShopOrder result = service.redeem(" valid-code ");

    assertEquals(ShopOrderService.RECEIVED, result.getStatus());
    verify(mapper).redeemOrder(7L, "valid-code");
    ArgumentCaptor<ShopOrderStatusLog> log = ArgumentCaptor.forClass(ShopOrderStatusLog.class);
    verify(mapper).insertStatusLog(log.capture());
    assertEquals(31L, log.getValue().getOrderId());
    assertEquals(ShopOrderService.PAID, log.getValue().getFromStatus());
    assertEquals(ShopOrderService.RECEIVED, log.getValue().getToStatus());
    assertEquals("MERCHANT", log.getValue().getOperatorType());
    assertEquals(7L, log.getValue().getOperatorId());
  }

  @Test
  void merchantCannotRedeemAnotherMerchantsCode() {
    authenticateMerchant(7L);
    when(mapper.redeemOrder(7L, "foreign-code")).thenReturn(0);
    when(mapper.selectMerchantOrderByRedeemCode(7L, "foreign-code")).thenReturn(null);

    ServiceException error =
        assertThrows(ServiceException.class, () -> service.redeem("foreign-code"));

    assertTrue(error.getMessage().contains("不属于当前商家"));
    verify(mapper, never()).insertStatusLog(any());
  }

  @Test
  void repeatedRedeemIsRejectedWithoutDuplicatingAuditLog() {
    authenticateMerchant(7L);
    when(mapper.redeemOrder(7L, "used-code")).thenReturn(0);
    when(mapper.selectMerchantOrderByRedeemCode(7L, "used-code"))
        .thenReturn(order(31L, 7L, ShopOrderService.RECEIVED, "OFFLINE"));

    ServiceException error =
        assertThrows(ServiceException.class, () -> service.redeem("used-code"));

    assertTrue(error.getMessage().contains("已核销"));
    verify(mapper, never()).insertStatusLog(any());
  }

  @Test
  void previewRejectsPaidCodeWithWrongFulfillmentType() {
    authenticateMerchant(7L);
    when(mapper.selectMerchantOrderByRedeemCode(7L, "delivery-code"))
        .thenReturn(order(32L, 7L, ShopOrderService.PAID, "ONLINE"));

    assertThrows(ServiceException.class, () -> service.previewRedeem("delivery-code"));
  }

  private void authenticateMerchant(long merchantId) {
    ShopMerchant merchant = new ShopMerchant();
    merchant.setMerchantId(merchantId);
    when(merchantService.currentMerchantAccount()).thenReturn(merchant);
  }

  private ShopOrder order(long orderId, long merchantId, String status, String fulfillmentType) {
    ShopOrder order = new ShopOrder();
    order.setOrderId(orderId);
    order.setMerchantId(merchantId);
    order.setStatus(status);
    order.setFulfillmentType(fulfillmentType);
    return order;
  }
}
