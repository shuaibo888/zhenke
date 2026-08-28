package com.ruoyi.shop.map;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopPlace;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class TencentMapCoordinateValidationTest {
  private final TencentMapService service = new TencentMapService(new TencentMapProperties());

  @Test
  void rejectsOutOfRangeProviderCoordinates() {
    String response =
        """
        {"status":0,"data":[{"id":"poi-100","title":"异常地点","address":"测试地址",
        "location":{"lat":91,"lng":121.473701}}]}
        """;

    assertThrows(ServiceException.class, () -> service.parsePlaceDetailResponse(response));
  }

  @Test
  void rejectsOutOfRangeNavigationCoordinates() {
    ShopPlace place = new ShopPlace();
    place.setPlaceName("异常地点");
    place.setAddress("测试地址");
    place.setLatitude(new BigDecimal("31.230416"));
    place.setLongitude(new BigDecimal("181"));

    assertThrows(ServiceException.class, () -> service.navigationUri(place));
  }
}
