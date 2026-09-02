package com.ruoyi.shop.mapper;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ShopZhenkeCommentMapperXmlTest {
  @Test
  void replyInsertsRequireAnActiveTargetAndRootInThePublishedContent() throws IOException {
    assertAtomicReplyInsert(
        insertStatement(mapperXml("mapper/shop/ShopZhenkeMapper.xml")),
        "shop_zhenke_post_comment",
        "target.post_id=p.post_id",
        "root.post_id=p.post_id",
        "p.status='PUBLISHED'");
    assertAtomicReplyInsert(
        insertStatement(mapperXml("mapper/shop/ShopZhenkeEnjoyMapper.xml")),
        "shop_zhenke_enjoy_comment",
        "target.enjoy_id=e.enjoy_id",
        "root.enjoy_id=e.enjoy_id",
        "e.status='0'");
  }

  private void assertAtomicReplyInsert(
      String statement,
      String commentTable,
      String targetOwnership,
      String rootOwnership,
      String publishedStatus) {
    assertTrue(statement.contains("<when test=\"replyToCommentId != null\">"));
    assertTrue(statement.contains("join " + commentTable + " target on " + targetOwnership));
    assertTrue(statement.contains("target.comment_id=#{replyToCommentId}"));
    assertTrue(statement.contains("target.del_flag='0'"));
    assertTrue(statement.contains("join " + commentTable + " root on " + rootOwnership));
    assertTrue(
        statement.contains(
            "root.comment_id=coalesce(target.parent_comment_id,target.comment_id)"));
    assertTrue(statement.contains("root.parent_comment_id is null"));
    assertTrue(statement.contains("root.del_flag='0'"));
    assertTrue(statement.contains(publishedStatus));
    assertTrue(statement.contains("select "));
    assertTrue(statement.contains("root.comment_id,target.comment_id"));
  }

  private String insertStatement(String xml) {
    String startMarker = "<insert id=\"insertComment\"";
    int start = xml.indexOf(startMarker);
    assertTrue(start >= 0, "missing insertComment mapper statement");
    int end = xml.indexOf("</insert>", start);
    assertTrue(end > start, "unterminated insertComment mapper statement");
    return xml.substring(start, end + "</insert>".length());
  }

  private String mapperXml(String resource) throws IOException {
    try (InputStream input = getClass().getClassLoader().getResourceAsStream(resource)) {
      assertNotNull(input, resource + " must be available as a module resource");
      return new String(input.readAllBytes(), StandardCharsets.UTF_8);
    }
  }
}
