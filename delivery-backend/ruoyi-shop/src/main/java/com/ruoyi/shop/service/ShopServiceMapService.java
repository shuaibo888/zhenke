package com.ruoyi.shop.service;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.vo.ShopServiceMapPoint;
import com.ruoyi.shop.mapper.ShopServiceMapMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ShopServiceMapService {
  private static final double EARTH_RADIUS_KM = 6371.0088;
  private final ShopServiceMapMapper mapper;
  private final ShopPublicMediaService publicMedia;

  public ShopServiceMapService(ShopServiceMapMapper mapper, ShopPublicMediaService publicMedia) {
    this.mapper = mapper;
    this.publicMedia = publicMedia;
  }

  public List<ShopServiceMapPoint> points(
      String requestedCity, BigDecimal latitude, BigDecimal longitude) {
    String city = normalizeCity(requestedCity);
    String cityKeyword = cityKeyword(city);
    boolean hasCenter = latitude != null || longitude != null;
    if (hasCenter) requireCoordinates(latitude, longitude);

    List<ShopServiceMapPoint> rows = new ArrayList<>();
    rows.addAll(mapper.selectPostPoints(city, cityKeyword));
    rows.addAll(mapper.selectEnjoyPoints(city, cityKeyword));
    rows.addAll(mapper.selectMerchantPoints(city, cityKeyword));
    rows.removeIf(point -> point.getLatitude() == null || point.getLongitude() == null);
    rows.forEach(
        point -> {
          point.setCoverUrl(publicMedia.publicUrl(point.getCoverUrl()));
          if (hasCenter) {
            point.setDistanceKm(
                BigDecimal.valueOf(
                        distanceKm(
                            latitude.doubleValue(),
                            longitude.doubleValue(),
                            point.getLatitude().doubleValue(),
                            point.getLongitude().doubleValue()))
                    .setScale(2, RoundingMode.HALF_UP)
                    .doubleValue());
          }
        });
    if (hasCenter) {
      rows.sort(Comparator.comparing(ShopServiceMapPoint::getDistanceKm));
    }
    return rows;
  }

  String normalizeCity(String requestedCity) {
    String city = StringUtils.trim(requestedCity);
    if (StringUtils.isEmpty(city) || city.length() < 2 || city.length() > 40) {
      throw new ServiceException("地图查询城市无效");
    }
    return city;
  }

  String cityKeyword(String city) {
    for (String suffix : List.of("自治州", "地区", "市", "盟")) {
      if (city.endsWith(suffix) && city.length() > suffix.length() + 1) {
        return city.substring(0, city.length() - suffix.length());
      }
    }
    return city;
  }

  private void requireCoordinates(BigDecimal latitude, BigDecimal longitude) {
    if (latitude == null
        || longitude == null
        || latitude.compareTo(BigDecimal.valueOf(-90)) < 0
        || latitude.compareTo(BigDecimal.valueOf(90)) > 0
        || longitude.compareTo(BigDecimal.valueOf(-180)) < 0
        || longitude.compareTo(BigDecimal.valueOf(180)) > 0) {
      throw new ServiceException("地图中心坐标无效");
    }
  }

  private double distanceKm(double fromLat, double fromLng, double toLat, double toLng) {
    double latitudeDelta = Math.toRadians(toLat - fromLat);
    double longitudeDelta = Math.toRadians(toLng - fromLng);
    double value =
        Math.sin(latitudeDelta / 2d) * Math.sin(latitudeDelta / 2d)
            + Math.cos(Math.toRadians(fromLat))
                * Math.cos(Math.toRadians(toLat))
                * Math.sin(longitudeDelta / 2d)
                * Math.sin(longitudeDelta / 2d);
    return EARTH_RADIUS_KM * 2d * Math.atan2(Math.sqrt(value), Math.sqrt(1d - value));
  }
}
