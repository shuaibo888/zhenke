package com.ruoyi.shop.domain;

import java.util.Date;

/** Official ZhenbiXiang editorial content published by platform administrators. */
public class ShopZhenkeEnjoy {
  private Long enjoyId;
  private String category;
  private String title;
  private String subtitle;
  private String coverUrl;
  private String content;
  private String highlights;
  private String placeName;
  private String placeAddress;
  private Integer displaySort;
  private String status;
  private String delFlag;
  private String createBy;
  private String updateBy;
  private Date publishedAt;
  private Date createTime;
  private Date updateTime;
  private Integer likeCount;
  private Integer commentCount;
  private Boolean likedByMe;

  public Long getEnjoyId() { return enjoyId; }
  public void setEnjoyId(Long value) { enjoyId = value; }
  public String getCategory() { return category; }
  public void setCategory(String value) { category = value; }
  public String getTitle() { return title; }
  public void setTitle(String value) { title = value; }
  public String getSubtitle() { return subtitle; }
  public void setSubtitle(String value) { subtitle = value; }
  public String getCoverUrl() { return coverUrl; }
  public void setCoverUrl(String value) { coverUrl = value; }
  public String getContent() { return content; }
  public void setContent(String value) { content = value; }
  public String getHighlights() { return highlights; }
  public void setHighlights(String value) { highlights = value; }
  public String getPlaceName() { return placeName; }
  public void setPlaceName(String value) { placeName = value; }
  public String getPlaceAddress() { return placeAddress; }
  public void setPlaceAddress(String value) { placeAddress = value; }
  public Integer getDisplaySort() { return displaySort; }
  public void setDisplaySort(Integer value) { displaySort = value; }
  public String getStatus() { return status; }
  public void setStatus(String value) { status = value; }
  public String getDelFlag() { return delFlag; }
  public void setDelFlag(String value) { delFlag = value; }
  public String getCreateBy() { return createBy; }
  public void setCreateBy(String value) { createBy = value; }
  public String getUpdateBy() { return updateBy; }
  public void setUpdateBy(String value) { updateBy = value; }
  public Date getPublishedAt() { return publishedAt; }
  public void setPublishedAt(Date value) { publishedAt = value; }
  public Date getCreateTime() { return createTime; }
  public void setCreateTime(Date value) { createTime = value; }
  public Date getUpdateTime() { return updateTime; }
  public void setUpdateTime(Date value) { updateTime = value; }
  public Integer getLikeCount() { return likeCount; }
  public void setLikeCount(Integer value) { likeCount = value; }
  public Integer getCommentCount() { return commentCount; }
  public void setCommentCount(Integer value) { commentCount = value; }
  public Boolean getLikedByMe() { return likedByMe; }
  public void setLikedByMe(Boolean value) { likedByMe = value; }
}
