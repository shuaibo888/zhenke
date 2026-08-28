package com.ruoyi.shop.service;

import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.framework.config.ServerConfig;
import com.ruoyi.shop.domain.ShopHomeBanner;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkeEnjoyComment;
import com.ruoyi.shop.domain.ShopZhenkePost;
import com.ruoyi.shop.domain.ShopZhenkePostComment;
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
    if (value != null) value.setAvatar(publicUrl(value.getAvatar()));
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

  public List<ShopZhenkeEnjoy> enjoys(List<ShopZhenkeEnjoy> rows) {
    rows.forEach(this::enjoy);
    return rows;
  }

  public ShopZhenkeEnjoy enjoy(ShopZhenkeEnjoy value) {
    if (value != null) value.setCoverUrl(publicUrl(value.getCoverUrl()));
    return value;
  }

  public List<ShopZhenkeEnjoyComment> enjoyComments(List<ShopZhenkeEnjoyComment> rows) {
    rows.forEach(this::enjoyComment);
    return rows;
  }

  public ShopZhenkeEnjoyComment enjoyComment(ShopZhenkeEnjoyComment value) {
    if (value != null) value.setAvatar(publicUrl(value.getAvatar()));
    return value;
  }
}
