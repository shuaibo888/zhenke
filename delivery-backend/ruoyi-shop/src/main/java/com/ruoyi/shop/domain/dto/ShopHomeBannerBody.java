package com.ruoyi.shop.domain.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public class ShopHomeBannerBody {
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

  @NotNull
  @Min(0)
  private Integer bannerSort = 0;

  // Legacy clients may still send this field. It is intentionally ignored by
  // save operations; enable/disable is handled by the status endpoint.
  private String status;

  @JsonFormat(pattern = "yyyy-MM-dd")
  private LocalDate startTime;

  @JsonFormat(pattern = "yyyy-MM-dd")
  private LocalDate endTime;

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

  public LocalDate getStartTime() {
    return startTime;
  }

  public void setStartTime(LocalDate v) {
    startTime = v;
  }

  public LocalDate getEndTime() {
    return endTime;
  }

  public void setEndTime(LocalDate v) {
    endTime = v;
  }
}
