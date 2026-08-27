package com.ruoyi.shop.map;

import static org.junit.jupiter.api.Assertions.*;

import com.ruoyi.common.exception.ServiceException;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TencentMapServiceTest {
  private final TencentMapService service = new TencentMapService(new TencentMapProperties());

  @Test
  void parsesProviderPlaceAsAuthoritativeSelection() {
    String response =
        """
{"status":0,"result":{"id":"poi-100","title":"城市博物馆","category":"文化场馆",
"address":"人民路1号","location":{"lat":31.230416,"lng":121.473701},
"ad_info":{"province":"上海市","city":"上海市","district":"黄浦区","adcode":"310101","city_code":"156310100"}}}
""";

    Map<String, Object> place = service.parsePlaceDetailResponse(response);

    assertEquals("poi-100", place.get("providerPlaceId"));
    assertEquals("城市博物馆", place.get("placeName"));
    assertEquals("黄浦区", place.get("district"));
    assertEquals(new BigDecimal("31.230416"), place.get("latitude"));
  }

  @Test
  void rejectsIncompleteProviderPlace() {
    assertThrows(
        ServiceException.class,
        () -> service.parsePlaceDetailResponse("{\"status\":0,\"result\":{\"id\":\"poi-1\"}}"));
  }
}
