package com.ruoyi.shop.mapper;

import com.ruoyi.shop.domain.vo.ShopServiceMapPoint;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface ShopServiceMapMapper {
  List<ShopServiceMapPoint> selectPostPoints(
      @Param("city") String city, @Param("cityKeyword") String cityKeyword);

  List<ShopServiceMapPoint> selectEnjoyPoints(
      @Param("city") String city, @Param("cityKeyword") String cityKeyword);

  List<ShopServiceMapPoint> selectMerchantPoints(
      @Param("city") String city, @Param("cityKeyword") String cityKeyword);
}
