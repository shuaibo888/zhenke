package com.ruoyi.shop.map;

import static org.junit.jupiter.api.Assertions.*;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopPlace;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TencentMapServiceTest {
  private final TencentMapService service = new TencentMapService(new TencentMapProperties());

  @Test
  void parsesProviderPlaceAsAuthoritativeSelection() {
    String response =
        """
{"status":0,"count":1,"data":[{"id":"poi-100","title":"城市博物馆","category":"文化场馆",
"address":"人民路1号","location":{"lat":31.230416,"lng":121.473701},
"ad_info":{"province":"上海市","city":"上海市","district":"黄浦区","adcode":"310101","city_code":"156310100"}}]}
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
        () -> service.parsePlaceDetailResponse("{\"status\":0,\"data\":[{\"id\":\"poi-1\"}]}"));
  }

  @Test
  void navigationUsesConfiguredApplicationRefererInsteadOfSecretKey() {
    TencentMapProperties properties = new TencentMapProperties();
    properties.setKey("server-secret-key");
    properties.setReferer("zhenkexing-app");
    TencentMapService configuredService = new TencentMapService(properties);
    ShopPlace place = new ShopPlace();
    place.setPlaceName("城市博物馆");
    place.setAddress("人民路1号");
    place.setLatitude(new BigDecimal("31.230416"));
    place.setLongitude(new BigDecimal("121.473701"));

    String uri = configuredService.navigationUri(place).toASCIIString();

    assertTrue(uri.contains("referer=zhenkexing-app"));
    assertFalse(uri.contains("server-secret-key"));
  }

  @Test
  void reverseGeocoderDeclaresBrowserGpsCoordinateType() {
    TencentMapProperties properties = new TencentMapProperties();
    properties.setKey("server-secret-key");
    TencentMapService configuredService = new TencentMapService(properties);

    String uri =
        configuredService
            .reverseGeocoderUri(new BigDecimal("31.230416"), new BigDecimal("121.473701"))
            .toASCIIString();

    assertTrue(uri.contains("coord_type=1"));
    assertTrue(uri.contains("location=31.230416%2C121.473701"));
    assertTrue(uri.contains("key=server-secret-key"));
  }
}
