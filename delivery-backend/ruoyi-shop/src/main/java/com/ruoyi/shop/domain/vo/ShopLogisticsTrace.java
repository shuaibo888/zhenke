package com.ruoyi.shop.domain.vo;

import java.util.List;

public record ShopLogisticsTrace(
        String carrier,
        String trackingNo,
        String state,
        String providerMessage,
        List<ShopLogisticsTraceEvent> events)
{
}
