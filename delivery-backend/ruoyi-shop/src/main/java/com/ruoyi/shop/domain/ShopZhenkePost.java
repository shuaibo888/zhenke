package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public class ShopZhenkePost {
  private Long postId, shopUserId, placeId, merchantId;
  private String userName,
      nickName,
      avatar,
      title,
      content,
      suggestion,
      perspective,
      placeName,
      placeAddress,
      placeProvince,
      placeCity,
      placeDistrict,
      merchantName,
      status;
  private BigDecimal placeLatitude, placeLongitude;
  private Date publishedAt, deleteTime, createTime, updateTime;
  private Integer commentCount, usefulCount;
  private Boolean usefulByMe;
  private List<ShopZhenkePostResource> resources;

  public Long getPostId() {
    return postId;
  }

  public void setPostId(Long v) {
    postId = v;
  }

  public Long getShopUserId() {
    return shopUserId;
  }

  public void setShopUserId(Long v) {
    shopUserId = v;
  }

  public Long getPlaceId() {
    return placeId;
  }

  public void setPlaceId(Long v) {
    placeId = v;
  }

  public Long getMerchantId() {
    return merchantId;
  }

  public void setMerchantId(Long v) {
    merchantId = v;
  }

  public String getUserName() {
    return userName;
  }

  public void setUserName(String v) {
    userName = v;
  }

  public String getNickName() {
    return nickName;
  }

  public void setNickName(String v) {
    nickName = v;
  }

  public String getAvatar() {
    return avatar;
  }

  public void setAvatar(String v) {
    avatar = v;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String v) {
    title = v;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String v) {
    content = v;
  }

  public String getSuggestion() {
    return suggestion;
  }

  public void setSuggestion(String v) {
    suggestion = v;
  }

  public String getPerspective() {
    return perspective;
  }

  public void setPerspective(String v) {
    perspective = v;
  }

  public String getPlaceName() {
    return placeName;
  }

  public void setPlaceName(String v) {
    placeName = v;
  }

  public String getPlaceAddress() {
    return placeAddress;
  }

  public void setPlaceAddress(String v) {
    placeAddress = v;
  }

  public String getPlaceProvince() {
    return placeProvince;
  }

  public void setPlaceProvince(String v) {
    placeProvince = v;
  }

  public String getPlaceCity() {
    return placeCity;
  }

  public void setPlaceCity(String v) {
    placeCity = v;
  }

  public String getPlaceDistrict() {
    return placeDistrict;
  }

  public void setPlaceDistrict(String v) {
    placeDistrict = v;
  }

  public BigDecimal getPlaceLatitude() {
    return placeLatitude;
  }

  public void setPlaceLatitude(BigDecimal v) {
    placeLatitude = v;
  }

  public BigDecimal getPlaceLongitude() {
    return placeLongitude;
  }

  public void setPlaceLongitude(BigDecimal v) {
    placeLongitude = v;
  }

  public String getMerchantName() {
    return merchantName;
  }

  public void setMerchantName(String v) {
    merchantName = v;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String v) {
    status = v;
  }

  public Date getPublishedAt() {
    return publishedAt;
  }

  public void setPublishedAt(Date v) {
    publishedAt = v;
  }

  public Date getDeleteTime() {
    return deleteTime;
  }

  public void setDeleteTime(Date v) {
    deleteTime = v;
  }

  public Date getCreateTime() {
    return createTime;
  }

  public void setCreateTime(Date v) {
    createTime = v;
  }

  public Date getUpdateTime() {
    return updateTime;
  }

  public void setUpdateTime(Date v) {
    updateTime = v;
  }

  public Integer getCommentCount() {
    return commentCount;
  }

  public void setCommentCount(Integer v) {
    commentCount = v;
  }

  public Integer getUsefulCount() {
    return usefulCount;
  }

  public void setUsefulCount(Integer v) {
    usefulCount = v;
  }

  public Boolean getUsefulByMe() {
    return usefulByMe;
  }

  public void setUsefulByMe(Boolean v) {
    usefulByMe = v;
  }

  public List<ShopZhenkePostResource> getResources() {
    return resources;
  }

  public void setResources(List<ShopZhenkePostResource> v) {
    resources = v;
  }
}
