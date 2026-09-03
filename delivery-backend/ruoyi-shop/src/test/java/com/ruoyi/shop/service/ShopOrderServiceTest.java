package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.logistics.AliyunLogisticsService;
import com.ruoyi.shop.mapper.ShopCartMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShopOrderServiceTest {
  private final ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
  private final ShopOrderService service =
      new ShopOrderService(
          orderMapper,
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

  @Test
  void addressSnapshotBelongsOnlyToDeliveryOrdersAfterFulfillmentSplit() {
    assertTrue(service.shouldSnapshotAddress(ShopProductService.FULFILLMENT_ONLINE));
    assertFalse(service.shouldSnapshotAddress(ShopProductService.FULFILLMENT_OFFLINE));
  }

  @Test
  void eachLocalLifeProductUsesAnIndependentRedeemableOrderGroup() {
    ShopProduct hotel = product("ZHENKE_HOTEL", "0", "1");
    hotel.setProductId(101L);
    ShopProduct scenic = product("ZHENKE_SCENIC", "0", "1");
    scenic.setProductId(102L);

    assertEquals(101L, service.orderGroupingProductId(hotel));
    assertEquals(102L, service.orderGroupingProductId(scenic));
  }

  @Test
  void ordinaryProductsStillShareMerchantAndFulfillmentOrderGroups() {
    ShopProduct ordinary = product("GENERAL_GOODS", "1", "0");
    ordinary.setProductId(201L);

    assertNull(service.orderGroupingProductId(ordinary));
  }

  @Test
  void orderItemSnapshotsWhetherStockWasActuallyDeducted() {
    ShopProduct finite = new ShopProduct();
    finite.setStockUnlimited("0");
    ShopProduct unlimited = new ShopProduct();
    unlimited.setStockUnlimited("1");

    assertEquals("1", service.stockDeductedSnapshot(finite));
    assertEquals("0", service.stockDeductedSnapshot(unlimited));
  }

  @Test
  void restorationUsesOrderItemSnapshotAndTreatsLegacyNullAsDeducted() {
    ShopOrderItem finite = item(11L, 2, "1");
    ShopOrderItem unlimited = item(12L, 3, "0");
    ShopOrderItem legacy = item(13L, 4, null);
    when(orderMapper.restoreStock(11L, 2)).thenReturn(1);
    when(orderMapper.restoreStock(13L, 4)).thenReturn(1);

    service.restoreDeductedStock(List.of(finite, unlimited, legacy), "库存恢复失败");

    verify(orderMapper).restoreStock(11L, 2);
    verify(orderMapper, never()).restoreStock(12L, 3);
    verify(orderMapper).restoreStock(13L, 4);
  }

  @Test
  void restorationFailureStillRollsBackTheOwningTransaction() {
    ShopOrderItem finite = item(21L, 1, "1");
    when(orderMapper.restoreStock(21L, 1)).thenReturn(0);

    ServiceException error = assertThrows(
        ServiceException.class,
        () -> service.restoreDeductedStock(List.of(finite), "指定恢复失败"));

    assertEquals("指定恢复失败", error.getMessage());
  }

  private ShopProduct product(String categoryCode, String online, String offline) {
    ShopProduct product = new ShopProduct();
    product.setCategoryCode(categoryCode);
    product.setSupportsOnline(online);
    product.setSupportsOffline(offline);
    return product;
  }

  private ShopOrderItem item(long productId, int quantity, String stockDeducted) {
    ShopOrderItem item = new ShopOrderItem();
    item.setProductId(productId);
    item.setQuantity(quantity);
    item.setStockDeducted(stockDeducted);
    return item;
  }
}
