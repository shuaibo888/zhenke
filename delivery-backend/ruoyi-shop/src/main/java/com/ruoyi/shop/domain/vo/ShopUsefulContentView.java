package com.ruoyi.shop.domain.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.util.Date;

/** A published piece of the current user's content that has received useful feedback. */
public class ShopUsefulContentView {
  private String contentType;
  private Long contentId;
  private String title;
  private String summary;
  private String coverUrl;
  private Long usefulCount;
  private Date publishedAt;
  private String detailPath;

  public String getContentType() {
    return contentType;
  }

  public void setContentType(String value) {
    contentType = value;
  }

  public Long getContentId() {
    return contentId;
  }

  public void setContentId(Long value) {
    contentId = value;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String value) {
    title = value;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String value) {
    summary = value;
  }

  public String getCoverUrl() {
    return coverUrl;
  }

  public void setCoverUrl(String value) {
    coverUrl = value;
  }

  public Long getUsefulCount() {
    return usefulCount;
  }

  public void setUsefulCount(Long value) {
    usefulCount = value;
  }

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  public Date getPublishedAt() {
    return publishedAt;
  }

  public void setPublishedAt(Date value) {
    publishedAt = value;
  }

  public String getDetailPath() {
    return detailPath;
  }

  public void setDetailPath(String value) {
    detailPath = value;
  }
}
