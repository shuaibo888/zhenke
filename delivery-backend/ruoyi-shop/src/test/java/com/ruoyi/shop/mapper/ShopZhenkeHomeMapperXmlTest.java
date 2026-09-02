package com.ruoyi.shop.mapper;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.apache.ibatis.builder.xml.XMLMapperEntityResolver;
import org.junit.jupiter.api.Test;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

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

  @Test
  void featuredAndUsefulAuthorQueriesOnlyExposePublishedPosts() throws IOException {
    String xml = mapperXml("mapper/shop/ShopZhenkeMapper.xml");
    String featured = statement(xml, "<select id=\"selectFeaturedPosts\"", "</select>");
    String useful = statement(xml, "<select id=\"selectUsefulContentByAuthor\"", "</select>");

    assertTrue(featured.contains("p.del_flag='0'"));
    assertTrue(featured.contains("p.status='PUBLISHED'"));
    assertTrue(featured.contains("p.featured_flag='1'"));
    assertTrue(featured.contains("p.place_city=#{city}"));
    assertTrue(featured.contains("limit #{limit}"));
    assertTrue(useful.contains("post.del_flag='0'"));
    assertTrue(useful.contains("post.status='PUBLISHED'"));
    assertTrue(useful.contains("group by post_id"));
  }

  @Test
  void reportUsefulAuthorQueryOnlyExposesPublishedReports() throws IOException {
    String xml = mapperXml("mapper/shop/ShopTrialMapper.xml");
    String useful = statement(xml, "<select id=\"selectUsefulContentByUser\"", "</select>");

    assertTrue(useful.contains("report.status = 'PUBLISHED'"));
    assertTrue(useful.contains("group by report_id"));
    assertTrue(useful.contains("concat('/reports/'"));
  }

  @Test
  void changedMappersRespectMybatisDtd() throws IOException, ParserConfigurationException, SAXException {
    validateMapperDtd("mapper/shop/ShopTrialMapper.xml");
    validateMapperDtd("mapper/shop/ShopZhenkeMapper.xml");
    validateMapperDtd("mapper/shop/ShopNotificationMapper.xml");
  }

  private void validateMapperDtd(String resource)
      throws ParserConfigurationException, IOException, SAXException {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setValidating(true);
    DocumentBuilder builder = factory.newDocumentBuilder();
    builder.setEntityResolver(new XMLMapperEntityResolver());
    builder.setErrorHandler(new ErrorHandler() {
      @Override
      public void warning(SAXParseException exception) throws SAXException {
        throw exception;
      }

      @Override
      public void error(SAXParseException exception) throws SAXException {
        throw exception;
      }

      @Override
      public void fatalError(SAXParseException exception) throws SAXException {
        throw exception;
      }
    });
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
      assertNotNull(input, resource + " must be available as a module resource");
      builder.parse(input);
    }
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
