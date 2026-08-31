package com.ruoyi.shop.service;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.SysConfig;
import com.ruoyi.system.mapper.SysConfigMapper;
import org.springframework.stereotype.Service;

@Service
public class ShopZhenkeCityScopeService {
  public static final String CITY_FILTER_ENABLED_KEY = "shop.zhenkexing.cityFilterEnabled";

  private final SysConfigMapper configMapper;

  public ShopZhenkeCityScopeService(SysConfigMapper configMapper) {
    this.configMapper = configMapper;
  }

  public boolean isCityFilterEnabled() {
    SysConfig config = configMapper.checkConfigKeyUnique(CITY_FILTER_ENABLED_KEY);
    return config != null
        && Boolean.parseBoolean(StringUtils.trim(config.getConfigValue()));
  }

  public String resolvePublicFeedCity(String requestedCity) {
    if (!isCityFilterEnabled()) return null;
    String city = StringUtils.trim(requestedCity);
    if (city.isEmpty()) {
      throw new ServiceException("请先定位或手动选择城市");
    }
    if (city.length() > 64) {
      throw new ServiceException("城市名称无效");
    }
    return city;
  }

}
