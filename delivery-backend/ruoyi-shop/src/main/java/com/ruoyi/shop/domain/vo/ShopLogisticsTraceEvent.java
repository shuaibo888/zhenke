package com.ruoyi.shop.domain.vo;

public record ShopLogisticsTraceEvent(
        String eventCode,
        String description,
        String location,
        String eventTime,
        String source,
        String sourceEventId)
{
}
