package com.ruoyi.shop.domain.vo;

/** Public homepage banner fields; operator and lifecycle audit fields stay admin-only. */
public record ShopHomeBannerPublicView(
    Long bannerId,
    String title,
    String subtitle,
    String imageUrl,
    String jumpType,
    String jumpTarget,
    Integer bannerSort) {}
