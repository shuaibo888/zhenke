package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.vo.ShopServiceMapPoint;
import com.ruoyi.shop.mapper.ShopServiceMapMapper;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShopServiceMapServiceTest {
  private final ShopServiceMapMapper mapper = mock(ShopServiceMapMapper.class);
  private final ShopPublicMediaService publicMedia = mock(ShopPublicMediaService.class);
  private final ShopServiceMapService service = new ShopServiceMapService(mapper, publicMedia);

  @Test
  void returnsEveryPointInCityAndSortsByDistanceWithoutDroppingFarPoints() {
    ShopServiceMapPoint nearMerchant = point("MERCHANT:1", "MERCHANT", "31.231000", "121.474000");
    ShopServiceMapPoint farPost = point("POST:2", "POST", "31.520000", "121.870000");
    when(mapper.selectPostPoints("上海市", "上海")).thenReturn(List.of(farPost));
    when(mapper.selectEnjoyPoints("上海市", "上海")).thenReturn(List.of());
    when(mapper.selectMerchantPoints("上海市", "上海"))
        .thenReturn(List.of(nearMerchant));
    when(publicMedia.publicUrl(any())).thenAnswer(invocation -> invocation.getArgument(0));

    List<ShopServiceMapPoint> rows =
        service.points(
            "上海市",
            new BigDecimal("31.230416"),
            new BigDecimal("121.473701"));

    assertEquals(2, rows.size());
    assertEquals("MERCHANT:1", rows.get(0).getPointKey());
    assertEquals(0.07d, rows.get(0).getDistanceKm(), 0.02d);
    assertEquals("POST:2", rows.get(1).getPointKey());
    assertTrue(rows.get(1).getDistanceKm() > 10d);
  }

  @Test
  void rejectsInvalidCityQueries() {
    assertThrows(
        ServiceException.class,
        () -> service.points(" ", new BigDecimal("31.230416"), new BigDecimal("121.473701")));
  }

  private ShopServiceMapPoint point(String key, String type, String latitude, String longitude) {
    ShopServiceMapPoint point = new ShopServiceMapPoint();
    point.setPointKey(key);
    point.setSourceType(type);
    point.setLatitude(new BigDecimal(latitude));
    point.setLongitude(new BigDecimal(longitude));
    return point;
  }
}
