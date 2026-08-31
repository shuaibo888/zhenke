package com.ruoyi.shop.service;

import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.shop.domain.ShopHomeBanner;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkeEnjoyComment;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.ShopZhenkePostComment;
import com.ruoyi.shop.domain.vo.ShopHomeBannerPublicView;
import com.ruoyi.shop.domain.vo.ShopZhenkeEnjoyPublicView;
import java.util.List;
import org.springframework.stereotype.Service;

/** Converts persisted platform-relative media paths into URLs usable by API clients. */
@Service
public class ShopPublicMediaService {
  private static final String PROFILE_PREFIX = "/profile/";
  private final ServerConfig serverConfig;

  public ShopPublicMediaService(ServerConfig serverConfig) {
    this.serverConfig = serverConfig;
  }

  public String publicUrl(String value) {
    String normalized = StringUtils.trim(value);
    if (normalized.startsWith(PROFILE_PREFIX)) {
      return serverConfig.getUrl() + normalized;
    }
    return normalized;
  }

  public List<ShopZhenkePost> posts(List<ShopZhenkePost> rows) {
    rows.forEach(this::post);
    return rows;
  }

  public ShopZhenkePost post(ShopZhenkePost value) {
    if (value == null) return null;
    value.setAvatar(publicUrl(value.getAvatar()));
    if (value.getResources() != null) {
      value.getResources().forEach(resource -> resource.setResourceUrl(publicUrl(resource.getResourceUrl())));
    }
    return value;
  }

  public List<ShopZhenkePostComment> comments(List<ShopZhenkePostComment> rows) {
    rows.forEach(this::comment);
    return rows;
  }

  public ShopZhenkePostComment comment(ShopZhenkePostComment value) {
    if (value != null) {
      value.setAvatar(publicUrl(value.getAvatar()));
      if (value.getReplies() != null) value.getReplies().forEach(this::comment);
    }
    return value;
  }

  public List<ShopHomeBanner> banners(List<ShopHomeBanner> rows) {
    rows.forEach(this::banner);
    return rows;
  }

  public ShopHomeBanner banner(ShopHomeBanner value) {
    if (value != null) value.setImageUrl(publicUrl(value.getImageUrl()));
    return value;
  }

  public List<ShopHomeBannerPublicView> publicBanners(List<ShopHomeBanner> rows) {
    return rows.stream()
        .map(
            value ->
                new ShopHomeBannerPublicView(
                    value.getBannerId(),
                    value.getTitle(),
                    value.getSubtitle(),
                    publicUrl(value.getImageUrl()),
                    value.getJumpType(),
                    value.getJumpTarget(),
                    value.getBannerSort()))
        .toList();
  }

  public List<ShopZhenkeEnjoy> enjoys(List<ShopZhenkeEnjoy> rows) {
    rows.forEach(this::enjoy);
    return rows;
  }

  public ShopZhenkeEnjoy enjoy(ShopZhenkeEnjoy value) {
    if (value != null) {
      value.setCoverUrl(publicUrl(value.getCoverUrl()));
      if (value.getMediaUrls() != null) {
        value.setMediaUrls(value.getMediaUrls().stream().map(this::publicUrl).toList());
      }
    }
    return value;
  }

  public List<ShopZhenkeEnjoyPublicView> publicEnjoys(List<ShopZhenkeEnjoy> rows) {
    return rows.stream().map(this::publicEnjoy).toList();
  }

  public ShopZhenkeEnjoyPublicView publicEnjoy(ShopZhenkeEnjoy value) {
    if (value == null) return null;
    List<String> mediaUrls =
        value.getMediaUrls() == null
            ? List.of()
            : value.getMediaUrls().stream().map(this::publicUrl).toList();
    return new ShopZhenkeEnjoyPublicView(
        value.getEnjoyId(),
        value.getCategory(),
        value.getTitle(),
        value.getSubtitle(),
        publicUrl(value.getCoverUrl()),
        value.getContent(),
        value.getHighlights(),
        value.getServiceSummary(),
        value.getOpeningHours(),
        value.getContactPhone(),
        value.getPlaceId(),
        value.getPlaceName(),
        value.getPlaceType(),
        value.getPlaceAddress(),
        value.getPlaceProvince(),
        value.getPlaceCity(),
        value.getPlaceDistrict(),
        value.getPlaceLatitude(),
        value.getPlaceLongitude(),
        mediaUrls,
        value.getDisplaySort(),
        value.getPublishedAt(),
        value.getLikeCount(),
        value.getCommentCount(),
        value.getMediaCount(),
        value.getLikedByMe());
  }

  public List<ShopZhenkeEnjoyComment> enjoyComments(List<ShopZhenkeEnjoyComment> rows) {
    rows.forEach(this::enjoyComment);
    return rows;
  }

  public ShopZhenkeEnjoyComment enjoyComment(ShopZhenkeEnjoyComment value) {
    if (value != null) {
      value.setAvatar(publicUrl(value.getAvatar()));
      if (value.getReplies() != null) value.getReplies().forEach(this::enjoyComment);
    }
    return value;
  }
}
