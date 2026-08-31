package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.SysConfig;
import com.ruoyi.system.mapper.SysConfigMapper;
import org.junit.jupiter.api.Test;

class ShopZhenkeCityScopeServiceTest {
  private final SysConfigMapper configMapper = mock(SysConfigMapper.class);
  private final ShopZhenkeCityScopeService service =
      new ShopZhenkeCityScopeService(configMapper);

  @Test
  void disabledOrMissingConfigurationKeepsTheGlobalFeed() {
    when(configMapper.checkConfigKeyUnique(ShopZhenkeCityScopeService.CITY_FILTER_ENABLED_KEY))
        .thenReturn(null);

    assertFalse(service.isCityFilterEnabled());
    assertNull(service.resolvePublicFeedCity(null));
    assertNull(service.resolvePublicFeedCity("保定市"));
  }

  @Test
  void explicitFalseConfigurationKeepsTheGlobalFeed() {
    SysConfig config = new SysConfig();
    config.setConfigValue("false");
    when(configMapper.checkConfigKeyUnique(ShopZhenkeCityScopeService.CITY_FILTER_ENABLED_KEY))
        .thenReturn(config);

    assertFalse(service.isCityFilterEnabled());
    assertNull(service.resolvePublicFeedCity("保定市"));
  }

  @Test
  void enabledConfigurationRequiresAndNormalizesTheSelectedCity() {
    SysConfig config = new SysConfig();
    config.setConfigValue(" TRUE ");
    when(configMapper.checkConfigKeyUnique(ShopZhenkeCityScopeService.CITY_FILTER_ENABLED_KEY))
        .thenReturn(config);

    assertTrue(service.isCityFilterEnabled());
    assertEquals("保定市", service.resolvePublicFeedCity(" 保定市 "));
    assertThrows(ServiceException.class, () -> service.resolvePublicFeedCity(" "));
  }
}
