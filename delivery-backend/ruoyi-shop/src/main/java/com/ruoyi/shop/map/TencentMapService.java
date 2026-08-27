package com.ruoyi.shop.map;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.vo.ShopMerchantPublicView;
import com.ruoyi.shop.domain.ShopPlace;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TencentMapService {
  private static final Logger log = LoggerFactory.getLogger(TencentMapService.class);
  private static final String GEOCODER_URL = "https://apis.map.qq.com/ws/geocoder/v1/";
  private static final String URI_API_URL = "https://apis.map.qq.com/uri/v1/";

  private final TencentMapProperties properties;
  private final HttpClient httpClient;

  public TencentMapService(TencentMapProperties properties) {
    this.properties = properties;
    this.httpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(Math.max(1, properties.getConnectTimeoutSeconds())))
            .build();
  }

  public TencentMapLocation geocode(String address) {
    String normalizedAddress = StringUtils.trim(address);
    String key = StringUtils.trim(properties.getKey());
    if (!properties.isEnabled() || StringUtils.isEmpty(key)) {
      throw new ServiceException("腾讯地图地址解析服务尚未配置，请联系平台管理员");
    }
    if (StringUtils.isEmpty(normalizedAddress)) {
      throw new ServiceException("营业执照未识别出有效地址，请重新上传清晰图片");
    }

    String query = "address=" + encode(normalizedAddress) + "&key=" + encode(key);
    HttpRequest request =
        HttpRequest.newBuilder(URI.create(GEOCODER_URL + "?" + query))
            .timeout(Duration.ofSeconds(Math.max(1, properties.getRequestTimeoutSeconds())))
            .header("Accept", "application/json")
            .GET()
            .build();
    try {
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.warn("Tencent map geocoder returned HTTP status {}", response.statusCode());
        throw new ServiceException("店铺地址定位失败，请稍后重新提交");
      }
      return parseLocation(response.body());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new ServiceException("店铺地址定位请求已中断，请重新提交");
    } catch (ServiceException exception) {
      throw exception;
    } catch (Exception exception) {
      log.warn("Tencent map geocoder request failed: {}", exception.getMessage());
      throw new ServiceException("店铺地址定位失败，请稍后重新提交");
    }
  }

  TencentMapLocation parseLocation(String responseBody) {
    try {
      JSONObject payload = JSON.parseObject(responseBody);
      Integer status = payload == null ? null : payload.getInteger("status");
      JSONObject result = payload == null ? null : payload.getJSONObject("result");
      JSONObject location = result == null ? null : result.getJSONObject("location");
      BigDecimal latitude = location == null ? null : location.getBigDecimal("lat");
      BigDecimal longitude = location == null ? null : location.getBigDecimal("lng");
      if (status == null
          || status != 0
          || latitude == null
          || longitude == null
          || latitude.compareTo(BigDecimal.valueOf(-90)) < 0
          || latitude.compareTo(BigDecimal.valueOf(90)) > 0
          || longitude.compareTo(BigDecimal.valueOf(-180)) < 0
          || longitude.compareTo(BigDecimal.valueOf(180)) > 0) {
        String providerMessage = payload == null ? null : payload.getString("message");
        log.warn(
            "Tencent map geocoder rejected address, status={}, message={}",
            status,
            safeProviderMessage(providerMessage));
        throw new ServiceException("营业执照地址无法准确定位，请核对执照图片后重试");
      }
      return new TencentMapLocation(
          latitude.setScale(6, RoundingMode.HALF_UP), longitude.setScale(6, RoundingMode.HALF_UP));
    } catch (ServiceException exception) {
      throw exception;
    } catch (Exception exception) {
      log.warn("Tencent map geocoder returned invalid JSON");
      throw new ServiceException("店铺地址定位结果异常，请稍后重新提交");
    }
  }

  public URI navigationUri(ShopMerchantPublicView merchant) {
    String shopName = StringUtils.trim(merchant.getShopName());
    String storeAddress = StringUtils.trim(merchant.getStoreAddress());
    return navigationUri(
        shopName, storeAddress, merchant.getLatitude(), merchant.getLongitude(), "该商家导航信息不完整");
  }

  public URI navigationUri(ShopPlace place) {
    return navigationUri(
        StringUtils.trim(place.getPlaceName()),
        StringUtils.trim(place.getAddress()),
        place.getLatitude(),
        place.getLongitude(),
        "该地点导航信息不完整");
  }

  private URI navigationUri(
      String name, String address, BigDecimal latitude, BigDecimal longitude, String invalidMessage) {
    String referer = StringUtils.trim(properties.getReferer());
    if (!properties.isEnabled() || StringUtils.isEmpty(referer)) {
      throw new ServiceException("腾讯地图导航服务尚未配置");
    }
    if (StringUtils.isEmpty(name)
        || StringUtils.isEmpty(address)
        || latitude == null
        || longitude == null) {
      throw new ServiceException(invalidMessage);
    }
    requireCoordinates(latitude, longitude);
    String marker =
        "coord:"
            + latitude.toPlainString()
            + ","
            + longitude.toPlainString()
            + ";title:"
            + name
            + ";addr:"
            + address;
    String query = "marker=" + encode(marker) + "&referer=" + encode(referer);
    return URI.create(URI_API_URL + "marker?" + query);
  }

  public Map<String, Object> reverse(BigDecimal latitude, BigDecimal longitude) {
    JSONObject result = requestJson(reverseGeocoderUri(latitude, longitude).toASCIIString());
    JSONObject address = result.getJSONObject("address_component");
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("address", result.getString("address"));
    value.put("province", address == null ? null : address.getString("province"));
    value.put("city", address == null ? null : address.getString("city"));
    value.put("district", address == null ? null : address.getString("district"));
    return value;
  }

  URI reverseGeocoderUri(BigDecimal latitude, BigDecimal longitude) {
    requireCoordinates(latitude, longitude);
    String query =
        "location="
            + encode(latitude.toPlainString() + "," + longitude.toPlainString())
            + "&coord_type=1&key="
            + encode(requireKey());
    return URI.create(GEOCODER_URL + "?" + query);
  }

  public List<Map<String, Object>> search(String keyword) {
    return search(keyword, null);
  }

  public List<Map<String, Object>> search(String keyword, String region) {
    String q = StringUtils.trim(keyword);
    if (q.isEmpty() || q.length() > 80) throw new ServiceException("地点搜索关键词无效");
    String normalizedRegion = StringUtils.trim(region);
    if (normalizedRegion.length() > 40) throw new ServiceException("地点搜索区域无效");
    String boundaryRegion = StringUtils.isEmpty(normalizedRegion) ? "全国" : normalizedRegion;
    JSONObject result =
        requestJson(
            "https://apis.map.qq.com/ws/place/v1/search?boundary=region("
                + encode(boundaryRegion)
                + ",0)&page_size=20&keyword="
                + encode(q)
                + "&key="
                + encode(requireKey()));
    List<Map<String, Object>> rows = new ArrayList<>();
    if (result.getJSONArray("data") == null) return rows;
    result
        .getJSONArray("data")
        .forEach(
            raw -> {
              JSONObject item = (JSONObject) raw;
              JSONObject loc = item.getJSONObject("location");
              JSONObject ad = item.getJSONObject("ad_info");
              BigDecimal latitude = loc == null ? null : loc.getBigDecimal("lat");
              BigDecimal longitude = loc == null ? null : loc.getBigDecimal("lng");
              if (item.getString("id") == null || !coordinatesValid(latitude, longitude)) return;
              Map<String, Object> row = new LinkedHashMap<>();
              row.put("provider", "TENCENT");
              row.put("providerPlaceId", item.getString("id"));
              row.put("placeName", item.getString("title"));
              row.put("placeType", item.getString("category"));
              row.put("address", item.getString("address"));
              row.put("province", ad == null ? null : ad.getString("province"));
              row.put("city", ad == null ? null : ad.getString("city"));
              row.put("district", ad == null ? null : ad.getString("district"));
              row.put("provinceCode", ad == null ? null : ad.getString("adcode"));
              row.put("cityCode", ad == null ? null : ad.getString("city_code"));
              row.put("districtCode", ad == null ? null : ad.getString("adcode"));
              row.put("latitude", latitude);
              row.put("longitude", longitude);
              rows.add(row);
            });
    return rows;
  }

  /** Resolve a selected provider id again on the server before it is persisted. */
  public Map<String, Object> placeDetail(String providerPlaceId) {
    String id = StringUtils.trim(providerPlaceId);
    if (id.isEmpty() || id.length() > 128) {
      throw new ServiceException("地点标识无效");
    }
    JSONObject item =
        requestJson(
            "https://apis.map.qq.com/ws/place/v1/detail?id="
                + encode(id)
                + "&key="
                + encode(requireKey()));
    return toPublicPlace(item);
  }

  Map<String, Object> parsePlaceDetailResponse(String responseBody) {
    JSONObject payload = JSON.parseObject(responseBody);
    if (payload == null
        || payload.getIntValue("status") != 0
        || payload.getJSONObject("result") == null) {
      throw new ServiceException("地图服务未返回有效地点");
    }
    return toPublicPlace(payload.getJSONObject("result"));
  }

  private Map<String, Object> toPublicPlace(JSONObject item) {
    JSONObject location = item.getJSONObject("location");
    JSONObject address = item.getJSONObject("ad_info");
    BigDecimal latitude = location == null ? null : location.getBigDecimal("lat");
    BigDecimal longitude = location == null ? null : location.getBigDecimal("lng");
    if (location == null
        || item.getString("id") == null
        || StringUtils.isEmpty(StringUtils.trim(item.getString("title")))
        || StringUtils.isEmpty(StringUtils.trim(item.getString("address")))
        || !coordinatesValid(latitude, longitude)) {
      throw new ServiceException("地图服务未返回有效地点");
    }
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("provider", "TENCENT");
    value.put("providerPlaceId", item.getString("id"));
    value.put("placeName", item.getString("title"));
    value.put("placeType", item.getString("category"));
    value.put("address", item.getString("address"));
    value.put("province", address == null ? null : address.getString("province"));
    value.put("city", address == null ? null : address.getString("city"));
    value.put("district", address == null ? null : address.getString("district"));
    value.put("provinceCode", address == null ? null : address.getString("adcode"));
    value.put("cityCode", address == null ? null : address.getString("city_code"));
    value.put("districtCode", address == null ? null : address.getString("adcode"));
    value.put("latitude", latitude);
    value.put("longitude", longitude);
    return value;
  }

  private JSONObject requestJson(String url) {
    HttpRequest request =
        HttpRequest.newBuilder(URI.create(url))
            .timeout(Duration.ofSeconds(Math.max(1, properties.getRequestTimeoutSeconds())))
            .header("Accept", "application/json")
            .GET()
            .build();
    try {
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() / 100 != 2) throw new ServiceException("地图服务暂时不可用");
      JSONObject payload = JSON.parseObject(response.body());
      if (payload == null || payload.getIntValue("status") != 0)
        throw new ServiceException("地图服务未返回有效结果");
      return payload.getJSONObject("result") == null ? payload : payload.getJSONObject("result");
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ServiceException("地图请求已中断");
    } catch (ServiceException e) {
      throw e;
    } catch (Exception e) {
      log.warn("Tencent map request failed: {}", e.getMessage());
      throw new ServiceException("地图服务暂时不可用，请稍后重试或手动输入更完整的地点关键词");
    }
  }

  private String requireKey() {
    String key = StringUtils.trim(properties.getKey());
    if (!properties.isEnabled() || key.isEmpty())
      throw new ServiceException("地图服务尚未配置，仍可浏览内容，但暂时无法定位或选点");
    return key;
  }

  private void requireCoordinates(BigDecimal lat, BigDecimal lng) {
    if (!coordinatesValid(lat, lng)) throw new ServiceException("定位坐标无效");
  }

  private boolean coordinatesValid(BigDecimal lat, BigDecimal lng) {
    return lat != null
        && lng != null
        && lat.compareTo(BigDecimal.valueOf(-90)) >= 0
        && lat.compareTo(BigDecimal.valueOf(90)) <= 0
        && lng.compareTo(BigDecimal.valueOf(-180)) >= 0
        && lng.compareTo(BigDecimal.valueOf(180)) <= 0;
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private String safeProviderMessage(String value) {
    String message = StringUtils.trim(value);
    if (StringUtils.isEmpty(message)) return "-";
    return message.length() > 120 ? message.substring(0, 120) : message;
  }
}
