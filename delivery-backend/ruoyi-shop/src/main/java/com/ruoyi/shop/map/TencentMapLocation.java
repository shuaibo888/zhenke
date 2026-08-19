package com.ruoyi.shop.map;

import java.math.BigDecimal;

public class TencentMapLocation
{
    private final BigDecimal latitude;
    private final BigDecimal longitude;

    public TencentMapLocation(BigDecimal latitude, BigDecimal longitude)
    {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
}
