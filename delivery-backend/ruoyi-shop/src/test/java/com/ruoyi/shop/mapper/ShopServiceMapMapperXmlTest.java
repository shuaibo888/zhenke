package com.ruoyi.shop.mapper;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import javax.xml.parsers.DocumentBuilderFactory;
import org.apache.ibatis.builder.xml.XMLMapperEntityResolver;
import org.junit.jupiter.api.Test;

class ShopServiceMapMapperXmlTest {
  private static final String RESOURCE = "mapper/shop/ShopServiceMapMapper.xml";

  @Test
  void mapQueriesExposeOnlyPublicContentAndApprovedMerchants() throws Exception {
    String xml = mapperXml();

    assertTrue(xml.contains("post.status='PUBLISHED'"));
    assertTrue(xml.contains("enjoy.status='0'"));
    assertTrue(xml.contains("merchant.audit_status='APPROVED'"));
    assertTrue(xml.contains("report.status='PUBLISHED'"));
    assertTrue(xml.contains("row_number() over(partition by post.place_id"));
    assertTrue(xml.contains("partition by enjoy.category,enjoy.place_id"));
    assertTrue(xml.contains("trim(place.city)=#{city}"));
    assertTrue(xml.contains("merchant.company_address like concat('%',#{cityKeyword},'%')"));
  }

  @Test
  void mapperRespectsMybatisDtd() throws Exception {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setValidating(true);
    var builder = factory.newDocumentBuilder();
    builder.setEntityResolver(new XMLMapperEntityResolver());
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(RESOURCE)) {
      assertNotNull(input);
      builder.parse(input);
    }
  }

  private String mapperXml() throws IOException {
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(RESOURCE)) {
      assertNotNull(input);
      return new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
  }
}
