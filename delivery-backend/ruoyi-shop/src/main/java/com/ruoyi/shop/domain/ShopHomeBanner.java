package com.ruoyi.shop.domain;

import java.util.Date;

public class ShopHomeBanner {
  private Long bannerId;
  private String title, subtitle, imageUrl, jumpType, jumpTarget, status, createBy, updateBy;
  private Integer bannerSort;
  private Date startTime, endTime, createTime, updateTime;

  public Long getBannerId() {
    return bannerId;
  }

  public void setBannerId(Long v) {
    bannerId = v;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String v) {
    title = v;
  }

  public String getSubtitle() {
    return subtitle;
  }

  public void setSubtitle(String v) {
    subtitle = v;
  }

  public String getImageUrl() {
    return imageUrl;
  }

  public void setImageUrl(String v) {
    imageUrl = v;
  }

  public String getJumpType() {
    return jumpType;
  }

  public void setJumpType(String v) {
    jumpType = v;
  }

  public String getJumpTarget() {
    return jumpTarget;
  }

  public void setJumpTarget(String v) {
    jumpTarget = v;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String v) {
    status = v;
  }

  public Integer getBannerSort() {
    return bannerSort;
  }

  public void setBannerSort(Integer v) {
    bannerSort = v;
  }

  public Date getStartTime() {
    return startTime;
  }

  public void setStartTime(Date v) {
    startTime = v;
  }

  public Date getEndTime() {
    return endTime;
  }

  public void setEndTime(Date v) {
    endTime = v;
  }

  public String getCreateBy() {
    return createBy;
  }

  public void setCreateBy(String v) {
    createBy = v;
  }

  public String getUpdateBy() {
    return updateBy;
  }

  public void setUpdateBy(String v) {
    updateBy = v;
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
}
