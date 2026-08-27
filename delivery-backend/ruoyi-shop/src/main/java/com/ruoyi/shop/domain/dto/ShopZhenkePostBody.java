package com.ruoyi.shop.domain.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public class ShopZhenkePostBody {
  @NotBlank
  @Size(max = 120)
  private String title;

  @NotBlank
  @Size(max = 5000)
  private String content;

  @Size(max = 1000)
  private String suggestion;

  @NotBlank
  @Pattern(regexp = "LOCAL|TOURIST|HOMETOWNER")
  private String perspective;

  @NotNull @Valid private PlaceSelection place;
  private Long merchantId;

  @NotEmpty
  @Size(max = 9)
  @Valid
  private List<Resource> resources;

  public static class PlaceSelection {
    @NotBlank
    @Size(max = 32)
    private String provider;

    @NotBlank
    @Size(max = 128)
    private String providerPlaceId;

    @NotBlank
    @Size(max = 160)
    private String name;

    @Size(max = 64)
    private String type;

    @NotBlank
    @Size(max = 500)
    private String address;

    @Size(max = 64)
    private String province;

    @Size(max = 64)
    private String city;

    @Size(max = 64)
    private String district;

    @Size(max = 16)
    private String provinceCode, cityCode, districtCode;

    @NotNull
    @DecimalMin("-90")
    @DecimalMax("90")
    private BigDecimal latitude;

    @NotNull
    @DecimalMin("-180")
    @DecimalMax("180")
    private BigDecimal longitude;

    public String getProvider() {
      return provider;
    }

    public void setProvider(String v) {
      provider = v;
    }

    public String getProviderPlaceId() {
      return providerPlaceId;
    }

    public void setProviderPlaceId(String v) {
      providerPlaceId = v;
    }

    public String getName() {
      return name;
    }

    public void setName(String v) {
      name = v;
    }

    public String getType() {
      return type;
    }

    public void setType(String v) {
      type = v;
    }

    public String getAddress() {
      return address;
    }

    public void setAddress(String v) {
      address = v;
    }

    public String getProvince() {
      return province;
    }

    public void setProvince(String v) {
      province = v;
    }

    public String getCity() {
      return city;
    }

    public void setCity(String v) {
      city = v;
    }

    public String getDistrict() {
      return district;
    }

    public void setDistrict(String v) {
      district = v;
    }

    public String getProvinceCode() {
      return provinceCode;
    }

    public void setProvinceCode(String v) {
      provinceCode = v;
    }

    public String getCityCode() {
      return cityCode;
    }

    public void setCityCode(String v) {
      cityCode = v;
    }

    public String getDistrictCode() {
      return districtCode;
    }

    public void setDistrictCode(String v) {
      districtCode = v;
    }

    public BigDecimal getLatitude() {
      return latitude;
    }

    public void setLatitude(BigDecimal v) {
      latitude = v;
    }

    public BigDecimal getLongitude() {
      return longitude;
    }

    public void setLongitude(BigDecimal v) {
      longitude = v;
    }
  }

  public static class Resource {
    @NotBlank
    @Pattern(regexp = "IMAGE|VIDEO")
    private String resourceType;

    @NotBlank
    @Size(max = 500)
    private String resourceUrl;

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

  public PlaceSelection getPlace() {
    return place;
  }

  public void setPlace(PlaceSelection v) {
    place = v;
  }

  public Long getMerchantId() {
    return merchantId;
  }

  public void setMerchantId(Long v) {
    merchantId = v;
  }

  public List<Resource> getResources() {
    return resources;
  }

  public void setResources(List<Resource> v) {
    resources = v;
  }
}
