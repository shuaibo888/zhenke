package com.ruoyi.shop.domain;

public class ShopZhenkePostResource {
  private Long resourceId, postId;
  private String resourceType, resourceUrl;
  private Integer resourceSort;

  public Long getResourceId() {
    return resourceId;
  }

  public void setResourceId(Long v) {
    resourceId = v;
  }

  public Long getPostId() {
    return postId;
  }

  public void setPostId(Long v) {
    postId = v;
  }

  public String getResourceType() {
    return resourceType;
  }

  public void setResourceType(String v) {
    resourceType = v;
  }

  public String getResourceUrl() {
    return resourceUrl;
  }

  public void setResourceUrl(String v) {
    resourceUrl = v;
  }

  public Integer getResourceSort() {
    return resourceSort;
  }

  public void setResourceSort(Integer v) {
    resourceSort = v;
  }
}
