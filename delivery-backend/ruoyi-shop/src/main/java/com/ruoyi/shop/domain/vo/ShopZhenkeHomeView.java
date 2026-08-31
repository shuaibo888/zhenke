package com.ruoyi.shop.domain.vo;

import com.ruoyi.shop.domain.ShopZhenkePost;
import java.util.List;
import java.util.Map;

/** One-round-trip homepage payload with independent content error boundaries. */
public record ShopZhenkeHomeView(
    List<ShopZhenkePost> posts,
    List<ShopHomeBannerPublicView> banners,
    Map<String, List<ShopZhenkeEnjoyPublicView>> enjoys,
    String postError,
    String bannerError,
    String enjoyError) {}
