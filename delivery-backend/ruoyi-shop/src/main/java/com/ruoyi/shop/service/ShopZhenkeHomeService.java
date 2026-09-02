package com.ruoyi.shop.service;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.vo.ShopHomeBannerPublicView;
import com.ruoyi.shop.domain.vo.ShopZhenkeEnjoyPublicView;
import com.ruoyi.shop.domain.vo.ShopZhenkeHomeView;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ShopZhenkeHomeService {
  private static final Logger log = LoggerFactory.getLogger(ShopZhenkeHomeService.class);
  private static final List<String> ENJOY_CATEGORIES =
      List.of("SCENIC", "RESTAURANT", "HOTEL", "MALL");
  private final ShopZhenkeService postService;
  private final ShopZhenkeEnjoyService enjoyService;
  private final ShopPublicMediaService publicMedia;
  private final ShopZhenkeCityScopeService cityScope;

  public ShopZhenkeHomeService(
      ShopZhenkeService postService,
      ShopZhenkeEnjoyService enjoyService,
      ShopPublicMediaService publicMedia,
      ShopZhenkeCityScopeService cityScope) {
    this.postService = postService;
    this.enjoyService = enjoyService;
    this.publicMedia = publicMedia;
    this.cityScope = cityScope;
  }

  public ShopZhenkeHomeView load(String requestedCity) {
    String city = null;
    String scopeError = null;
    try {
      city = cityScope.resolvePublicFeedCity(requestedCity);
    } catch (ServiceException exception) {
      scopeError = exception.getMessage();
    }

    List<com.ruoyi.shop.domain.ShopZhenkePost> posts = List.of();
    String postError = scopeError;
    if (scopeError == null) {
      try {
        posts = publicMedia.posts(postService.homePosts(city, 9));
      } catch (RuntimeException exception) {
        log.warn("首页甄客帖加载失败", exception);
        postError = publicMessage(exception, "首页甄客帖暂时没有加载成功");
      }
    }

    List<ShopHomeBannerPublicView> banners = List.of();
    String bannerError = null;
    try {
      banners = publicMedia.publicBanners(postService.activeBanners());
    } catch (RuntimeException exception) {
      log.warn("首页轮播加载失败", exception);
      bannerError = publicMessage(exception, "今日精选暂时没有加载成功");
    }

    Map<String, List<ShopZhenkeEnjoyPublicView>> enjoys = emptyEnjoyGroups();
    String enjoyError = scopeError;
    if (scopeError == null) {
      try {
        List<ShopZhenkeEnjoy> rows = enjoyService.homeEnjoys(city, 2);
        for (ShopZhenkeEnjoyPublicView item : publicMedia.publicEnjoys(rows)) {
          List<ShopZhenkeEnjoyPublicView> group = enjoys.get(item.category());
          if (group != null) group.add(item);
        }
      } catch (RuntimeException exception) {
        log.warn("首页甄必享加载失败", exception);
        enjoyError = publicMessage(exception, "甄必享内容暂时没有加载成功");
      }
    }

    return new ShopZhenkeHomeView(
        posts, banners, immutableEnjoyGroups(enjoys), postError, bannerError, enjoyError);
  }

  private Map<String, List<ShopZhenkeEnjoyPublicView>> emptyEnjoyGroups() {
    Map<String, List<ShopZhenkeEnjoyPublicView>> groups = new LinkedHashMap<>();
    ENJOY_CATEGORIES.forEach(category -> groups.put(category, new java.util.ArrayList<>()));
    return groups;
  }

  private Map<String, List<ShopZhenkeEnjoyPublicView>> immutableEnjoyGroups(
      Map<String, List<ShopZhenkeEnjoyPublicView>> groups) {
    Map<String, List<ShopZhenkeEnjoyPublicView>> result = new LinkedHashMap<>();
    groups.forEach((category, rows) -> result.put(category, List.copyOf(rows)));
    return result;
  }

  private String publicMessage(RuntimeException exception, String fallback) {
    return exception instanceof ServiceException && exception.getMessage() != null
        ? exception.getMessage()
        : fallback;
  }
}
