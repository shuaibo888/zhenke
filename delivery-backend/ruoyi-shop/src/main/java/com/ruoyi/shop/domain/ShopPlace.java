package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;

public class ShopPlace {
  private Long placeId;
  private String provider,
      providerPlaceId,
      placeName,
      placeType,
      address,
      province,
      city,
      district,
      provinceCode,
      cityCode,
      districtCode,
      coordinateSystem,
      status;
  private BigDecimal latitude, longitude;
  private Date createTime, updateTime;

  public Long getPlaceId() {
    return placeId;
  }

  public void setPlaceId(Long v) {
    placeId = v;
  }

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

  public String getPlaceName() {
    return placeName;
  }

  public void setPlaceName(String v) {
    placeName = v;
  }

  public String getPlaceType() {
    return placeType;
  }

  public void setPlaceType(String v) {
    placeType = v;
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

  public String getCoordinateSystem() {
    return coordinateSystem;
  }

  public void setCoordinateSystem(String v) {
    coordinateSystem = v;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String v) {
    status = v;
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
