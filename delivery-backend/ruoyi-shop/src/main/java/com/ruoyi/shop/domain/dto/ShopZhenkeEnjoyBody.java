package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopZhenkeEnjoyBody {
  @NotBlank
  @Pattern(regexp = "MALL|RESTAURANT|SCENIC|HOTEL", message = "甄必享分类无效")
  private String category;

  @NotBlank @Size(max = 120) private String title;
  @Size(max = 240) private String subtitle;
  @NotBlank @Size(max = 500) private String coverUrl;
  @NotBlank @Size(max = 10000) private String content;
  @Size(max = 500) private String highlights;
  @Size(max = 160) private String placeName;
  @Size(max = 500) private String placeAddress;
  @Min(0) @Max(9999) private Integer displaySort;
  @NotBlank @Pattern(regexp = "0|1", message = "甄必享状态无效") private String status;

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
}
