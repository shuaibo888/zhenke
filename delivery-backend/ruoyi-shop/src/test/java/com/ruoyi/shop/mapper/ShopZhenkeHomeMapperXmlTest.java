package com.ruoyi.shop.mapper;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ShopZhenkeHomeMapperXmlTest {
  @Test
  void homepageQueriesBatchPostsAndRankEnjoysPerCategory() throws IOException {
    String postXml = mapperXml("mapper/shop/ShopZhenkeMapper.xml");
    String enjoyXml = mapperXml("mapper/shop/ShopZhenkeEnjoyMapper.xml");

    assertTrue(postXml.contains("id=\"selectResourcesByPostIds\""));
    assertTrue(postXml.contains("collection=\"postIds\""));
    assertTrue(enjoyXml.contains("id=\"selectHomeEnjoys\""));
    assertTrue(enjoyXml.contains("row_number() over("));
    assertTrue(enjoyXml.contains("partition by base.category"));
  }

  @Test
  void merchantOptionsUseExplicitMappingAndLegacyCompanyNameFallback() throws IOException {
    String postXml = mapperXml("mapper/shop/ShopZhenkeMapper.xml");
    String statement = statement(postXml, "<select id=\"selectActiveMerchantOptions\"", "</select>");

    assertTrue(postXml.contains("<resultMap id=\"merchantOption\""));
    assertTrue(postXml.contains("property=\"merchantId\" column=\"merchant_id\""));
    assertTrue(postXml.contains("property=\"shopName\" column=\"option_shop_name\""));
    assertTrue(statement.contains("resultMap=\"merchantOption\""));
    assertTrue(statement.contains("coalesce(nullif(trim(shop_name),''),company_name)"));
    assertFalse(statement.contains("resultType=\"ShopMerchantOption\""));
  }

  private String mapperXml(String resource) throws IOException {
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
      assertNotNull(input, resource + " must be available as a module resource");
      return new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
  }

  private String statement(String xml, String startMarker, String endMarker) {
    int start = xml.indexOf(startMarker);
    assertTrue(start >= 0, "missing mapper statement: " + startMarker);
    int end = xml.indexOf(endMarker, start);
    assertTrue(end > start, "unterminated mapper statement: " + startMarker);
    return xml.substring(start, end + endMarker.length());
  }
}
