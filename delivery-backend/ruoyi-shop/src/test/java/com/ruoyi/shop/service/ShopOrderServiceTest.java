package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.logistics.AliyunLogisticsService;
import com.ruoyi.shop.mapper.ShopCartMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import org.junit.jupiter.api.Test;

class ShopOrderServiceTest {
  private final ShopOrderService service =
      new ShopOrderService(
          mock(ShopOrderMapper.class),
          mock(ShopCartMapper.class),
          mock(AliyunLogisticsService.class),
          mock(ShopCouponService.class));

  @Test
  void localLifeCategoryCannotBeDowngradedToDeliveryByClient() {
    ShopProduct product = product("ZHENKE_HOTEL", "1", "1");

    assertEquals(
        ShopProductService.FULFILLMENT_OFFLINE,
        service.resolveFulfillment(product, ShopProductService.FULFILLMENT_ONLINE));
  }

  @Test
  void localLifeCategoryRejectsBrokenServerConfiguration() {
    ShopProduct product = product("ZHENKE_SCENIC", "1", "0");

    assertThrows(
        ServiceException.class,
        () -> service.resolveFulfillment(product, ShopProductService.FULFILLMENT_OFFLINE));
  }

  @Test
  void ordinaryProductStillKeepsExistingDeliveryCapability() {
    ShopProduct product = product("GENERAL_GOODS", "1", "0");

    assertEquals(
        ShopProductService.FULFILLMENT_ONLINE,
        service.resolveFulfillment(product, ShopProductService.FULFILLMENT_ONLINE));
  }

  @Test
  void ordinaryProductStillKeepsExistingOfflineRedemptionCapability() {
    ShopProduct product = product("GENERAL_OFFLINE", "0", "1");

    assertEquals(
        ShopProductService.FULFILLMENT_OFFLINE,
        service.resolveFulfillment(product, ShopProductService.FULFILLMENT_OFFLINE));
  }

  @Test
  void ordinaryProductWithBothCapabilitiesHonorsTheUsersFulfillmentChoice() {
    ShopProduct product = product("GENERAL_DUAL", "1", "1");

    assertEquals(
        ShopProductService.FULFILLMENT_ONLINE,
        service.resolveFulfillment(product, ShopProductService.FULFILLMENT_ONLINE));
    assertEquals(
        ShopProductService.FULFILLMENT_OFFLINE,
        service.resolveFulfillment(product, ShopProductService.FULFILLMENT_OFFLINE));
  }

  private ShopProduct product(String categoryCode, String online, String offline) {
    ShopProduct product = new ShopProduct();
    product.setCategoryCode(categoryCode);
    product.setSupportsOnline(online);
    product.setSupportsOffline(offline);
    return product;
  }
}
