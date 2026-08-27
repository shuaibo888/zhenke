package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.*;
import java.util.Date;

public class ShopHomeBannerBody {
  @NotBlank
  @Size(max = 120)
  private String title;

  @Size(max = 240)
  private String subtitle;

  @NotBlank
  @Size(max = 500)
  private String imageUrl;

  @NotBlank
  @Pattern(regexp = "INTERNAL|EXTERNAL")
  private String jumpType;

  @NotBlank
  @Size(max = 500)
  private String jumpTarget;

  @Min(0)
  private Integer bannerSort = 0;

  @Pattern(regexp = "0|1")
  private String status = "0";

  private Date startTime, endTime;

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

  public Integer getBannerSort() {
    return bannerSort;
  }

  public void setBannerSort(Integer v) {
    bannerSort = v;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String v) {
    status = v;
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
}
