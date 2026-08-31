package com.ruoyi.shop.mapper;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ShopZhenkeCityMapperXmlTest {
  @Test
  void publicPostAndEnjoyListsUseTheirPersistedPlaceCity() throws IOException {
    String postXml = mapperXml("mapper/shop/ShopZhenkeMapper.xml");
    String enjoyXml = mapperXml("mapper/shop/ShopZhenkeEnjoyMapper.xml");

    assertTrue(postXml.contains("and p.place_city=#{city}"));
    assertTrue(enjoyXml.contains("and p.city=#{city}"));
    assertTrue(postXml.contains("city != null and city != ''"));
    assertTrue(enjoyXml.contains("city != null and city != ''"));
  }

  private String mapperXml(String resource) throws IOException {
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
      assertNotNull(input, resource + " must be available as a module resource");
      return new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
  }
}
