package com.ruoyi.shop.domain.vo;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

/** Public official editorial fields; draft state, delete flags and operator audit fields are excluded. */
public record ShopZhenkeEnjoyPublicView(
    Long enjoyId,
    String category,
    String title,
    String subtitle,
    String coverUrl,
    String content,
    String highlights,
    String serviceSummary,
    String openingHours,
    String contactPhone,
    Long placeId,
    String placeName,
    String placeType,
    String placeAddress,
    String placeProvince,
    String placeCity,
    String placeDistrict,
    BigDecimal placeLatitude,
    BigDecimal placeLongitude,
    List<String> mediaUrls,
    Integer displaySort,
    Date publishedAt,
    Integer likeCount,
    Integer commentCount,
    Integer mediaCount,
    Boolean likedByMe) {}
