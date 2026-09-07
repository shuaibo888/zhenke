package com.ruoyi.shop.domain.vo;

import java.math.BigDecimal;

/** A public discovery marker rendered on the consumer service map. */
public class ShopServiceMapPoint {
  private String pointKey;
  private String sourceType;
  private String category;
  private Long targetId;
  private Long placeId;
  private String title;
  private String summary;
  private String coverUrl;
  private String address;
  private BigDecimal latitude;
  private BigDecimal longitude;
  private Integer contentCount;
  private Integer relatedCount;
  private Double distanceKm;

  public String getPointKey() { return pointKey; }
  public void setPointKey(String pointKey) { this.pointKey = pointKey; }
  public String getSourceType() { return sourceType; }
  public void setSourceType(String sourceType) { this.sourceType = sourceType; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public Long getTargetId() { return targetId; }
  public void setTargetId(Long targetId) { this.targetId = targetId; }
  public Long getPlaceId() { return placeId; }
  public void setPlaceId(Long placeId) { this.placeId = placeId; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getSummary() { return summary; }
  public void setSummary(String summary) { this.summary = summary; }
  public String getCoverUrl() { return coverUrl; }
  public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
  public String getAddress() { return address; }
  public void setAddress(String address) { this.address = address; }
  public BigDecimal getLatitude() { return latitude; }
  public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
  public BigDecimal getLongitude() { return longitude; }
  public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
  public Integer getContentCount() { return contentCount; }
  public void setContentCount(Integer contentCount) { this.contentCount = contentCount; }
  public Integer getRelatedCount() { return relatedCount; }
  public void setRelatedCount(Integer relatedCount) { this.relatedCount = relatedCount; }
  public Double getDistanceKm() { return distanceKm; }
  public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }
}
