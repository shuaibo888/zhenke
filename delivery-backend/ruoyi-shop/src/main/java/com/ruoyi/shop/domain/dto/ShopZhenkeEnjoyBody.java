package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import java.util.List;

public class ShopZhenkeEnjoyBody {
  @NotBlank
  @Pattern(regexp = "MALL|RESTAURANT|SCENIC|HOTEL", message = "甄必享分类无效")
  private String category;

  @NotBlank @Size(max = 120) private String title;
  @Size(max = 240) private String subtitle;
  @NotBlank @Size(max = 1000) private String serviceSummary;
  @NotBlank @Size(max = 20000) private String content;
  @Size(max = 500) private String highlights;
  @Size(max = 160) private String openingHours;
  @Size(max = 40)
  @Pattern(regexp = "^[0-9+()（）\\-\\s]{5,40}$", message = "联系电话格式无效")
  private String contactPhone;
  @NotNull @Valid private ShopZhenkePostBody.PlaceSelection place;
  @NotEmpty @Size(max = 9)
  private List<@NotBlank @Size(max = 500) String> mediaUrls;
  @Min(0) @Max(9999) private Integer displaySort;
  @NotBlank @Pattern(regexp = "0|1", message = "甄必享状态无效") private String status;

  public String getCategory() { return category; }
  public void setCategory(String value) { category = value; }
  public String getTitle() { return title; }
  public void setTitle(String value) { title = value; }
  public String getSubtitle() { return subtitle; }
  public void setSubtitle(String value) { subtitle = value; }
  public String getServiceSummary() { return serviceSummary; }
  public void setServiceSummary(String value) { serviceSummary = value; }
  public String getContent() { return content; }
  public void setContent(String value) { content = value; }
  public String getHighlights() { return highlights; }
  public void setHighlights(String value) { highlights = value; }
  public String getOpeningHours() { return openingHours; }
  public void setOpeningHours(String value) { openingHours = value; }
  public String getContactPhone() { return contactPhone; }
  public void setContactPhone(String value) { contactPhone = value; }
  public ShopZhenkePostBody.PlaceSelection getPlace() { return place; }
  public void setPlace(ShopZhenkePostBody.PlaceSelection value) { place = value; }
  public List<String> getMediaUrls() { return mediaUrls; }
  public void setMediaUrls(List<String> value) { mediaUrls = value; }
  public Integer getDisplaySort() { return displaySort; }
  public void setDisplaySort(Integer value) { displaySort = value; }
  public String getStatus() { return status; }
  public void setStatus(String value) { status = value; }
}
