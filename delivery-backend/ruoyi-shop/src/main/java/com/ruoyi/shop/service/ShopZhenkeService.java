package com.ruoyi.shop.service;

import com.github.pagehelper.PageHelper;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.*;
import com.ruoyi.shop.domain.dto.*;
import com.ruoyi.shop.map.TencentMapService;
import com.ruoyi.shop.mapper.ShopZhenkeMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.util.ShopPlatformMediaPathUtils;
import java.net.URI;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShopZhenkeService {
  private static final Set<String> PERSPECTIVE_FILTERS =
      Set.of("RECOMMEND", "LOCAL", "TOURIST", "HOMETOWNER");
  private static final int COMMENT_PREVIEW_SIZE = 3;
  private final ShopZhenkeMapper mapper;
  private final TencentMapService mapService;

  public ShopZhenkeService(ShopZhenkeMapper mapper, TencentMapService mapService) {
    this.mapper = mapper;
    this.mapService = mapService;
  }

  public List<ShopZhenkePost> posts(
      String perspectiveFilter, Long placeId, int pageNum, int pageSize) {
    return posts(perspectiveFilter, placeId, null, pageNum, pageSize);
  }

  public List<ShopZhenkePost> posts(
      String perspectiveFilter, Long placeId, String city, int pageNum, int pageSize) {
    return posts(perspectiveFilter, placeId, city, null, pageNum, pageSize);
  }

  public List<ShopZhenkePost> posts(
      String perspectiveFilter,
      Long placeId,
      String scopeCity,
      String postCity,
      int pageNum,
      int pageSize) {
    String filter = normalizePerspectiveFilter(perspectiveFilter);
    String normalizedScopeCity = normalizeCity(scopeCity);
    String normalizedPostCity = normalizeCity(postCity);
    if (normalizedPostCity != null && normalizedPostCity.length() > 64) {
      throw new ServiceException("帖子城市筛选无效");
    }
    if (normalizedScopeCity != null
        && normalizedPostCity != null
        && !normalizedScopeCity.equals(normalizedPostCity)) {
      return List.of();
    }
    String effectiveCity = normalizedPostCity != null ? normalizedPostCity : normalizedScopeCity;
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
    return hydrate(
        mapper.selectPosts(
            filter,
            null,
            placeId,
            null,
            null,
            null,
            false,
            null,
            null,
            ShopAccountIdentity.currentShopUserIdOrNull(),
            effectiveCity),
        false);
  }

  public List<String> postCities(String perspectiveFilter, String scopeCity) {
    return mapper.selectPostCities(
        normalizePerspectiveFilter(perspectiveFilter), normalizeCity(scopeCity));
  }

  private String normalizePerspectiveFilter(String perspectiveFilter) {
    String filter = StringUtils.trim(perspectiveFilter).toUpperCase(Locale.ROOT);
    if (filter.isEmpty()) filter = "RECOMMEND";
    if (!PERSPECTIVE_FILTERS.contains(filter)) {
      throw new ServiceException("帖子身份筛选无效");
    }
    return filter;
  }

  public List<ShopZhenkePost> homePosts(String city, int pageSize) {
    PageHelper.startPage(1, Math.max(1, Math.min(20, pageSize)), false);
    try {
      return hydrate(
          mapper.selectPosts(
              "RECOMMEND",
              null,
              null,
              null,
              null,
              null,
              false,
              null,
              null,
              ShopAccountIdentity.currentShopUserIdOrNull(),
              normalizeCity(city)),
          false);
    } finally {
      PageHelper.clearPage();
    }
  }

  public ShopZhenkePost detail(long id) {
    ShopZhenkePost p = mapper.selectPost(id, false, ShopAccountIdentity.currentShopUserIdOrNull());
    if (p == null) throw new ServiceException("甄客帖不存在或已删除");
    p.setResources(mapper.selectResources(id));
    return p;
  }

  public ShopPlace place(long id) {
    ShopPlace p = mapper.selectPlace(id);
    if (p == null) throw new ServiceException("地点不存在或已停用");
    return p;
  }

  public List<ShopZhenkePost> myPosts(int pageNum, int pageSize) {
    long uid = ShopAccountIdentity.requireAuthenticatedShopUserId();
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
    return hydrate(
        mapper.selectPosts("RECOMMEND", uid, null, null, null, null, true, null, null, uid, null),
        false);
  }

  @Transactional
  public String registerUpload(String resourceUrl, String originalFilename) {
    long uid = ShopAccountIdentity.requireShopUserId();
    String path = ShopPlatformMediaPathUtils.normalize(resourceUrl);
    if (!path.startsWith("/profile/upload/report/user-" + uid + "/")) {
      throw new ServiceException("上传资源地址无效");
    }
    ShopPlatformMediaPathUtils.requireStoredFile(path);
    String filename = StringUtils.trim(originalFilename).toLowerCase(Locale.ROOT);
    String resourceType = filename.endsWith(".mp4") ? "VIDEO" : "IMAGE";
    if (mapper.insertPendingUpload(uid, path, resourceType) != 1) {
      throw new ServiceException("上传资源登记失败");
    }
    return path;
  }

  @Transactional
  public ShopZhenkePost publish(ShopZhenkePostBody b) {
    long uid = ShopAccountIdentity.requireShopUserId();
    validateResources(b.getResources());
    ShopPlace p = resolveSelectedPlace(b.getPlace());
    if (b.getMerchantId() != null && mapper.countActiveMerchant(b.getMerchantId()) != 1)
      throw new ServiceException("关联商家不存在、未审核或已停用");
    ShopZhenkePost z = new ShopZhenkePost();
    z.setShopUserId(uid);
    z.setTitle(StringUtils.trim(b.getTitle()));
    z.setContent(StringUtils.trim(b.getContent()));
    z.setSuggestion(StringUtils.trim(b.getSuggestion()));
    z.setPerspective(b.getPerspective());
    z.setPlaceId(p.getPlaceId());
    z.setPlaceName(p.getPlaceName());
    z.setPlaceAddress(p.getAddress());
    z.setPlaceProvince(p.getProvince());
    z.setPlaceCity(p.getCity());
    z.setPlaceDistrict(p.getDistrict());
    z.setPlaceLatitude(p.getLatitude());
    z.setPlaceLongitude(p.getLongitude());
    z.setMerchantId(b.getMerchantId());
    if (mapper.insertPost(z) != 1 || z.getPostId() == null) {
      throw new ServiceException("甄客帖保存失败，请重试");
    }
    int sort = 1;
    for (var item : b.getResources()) {
      String resourceUrl = normalizeClaimedResourceUrl(item.getResourceUrl());
      if (mapper.claimPendingUpload(uid, resourceUrl, item.getResourceType(), z.getPostId()) != 1) {
        throw new ServiceException("媒体未由当前账号上传、已被使用或已经过期");
      }
      ShopZhenkePostResource r = new ShopZhenkePostResource();
      r.setPostId(z.getPostId());
      r.setResourceType(item.getResourceType());
      r.setResourceUrl(resourceUrl);
      r.setResourceSort(sort++);
      if (mapper.insertResource(r) != 1) throw new ServiceException("甄客帖媒体保存失败，请重试");
    }
    return detail(z.getPostId());
  }

  @Transactional
  public void deleteOwn(long id) {
    if (mapper.deleteOwnPost(id, ShopAccountIdentity.requireAuthenticatedShopUserId()) != 1)
      throw new ServiceException("只能删除本人公开的甄客帖");
  }

  @Transactional
  public Map<String, Object> toggleUseful(long id) {
    long uid = ShopAccountIdentity.requireShopUserId();
    ShopZhenkePost post = detail(id);
    if (Objects.equals(post.getShopUserId(), uid)) {
      throw new ServiceException("不能将自己的甄客帖标记为有用");
    }
    if (mapper.countUseful(id, uid) > 0) {
      mapper.deleteUseful(id, uid);
    } else {
      mapper.insertUseful(id, uid);
    }
    boolean active = mapper.countUseful(id, uid) > 0;
    ShopZhenkePost p = detail(id);
    return Map.of("useful", active, "usefulCount", p.getUsefulCount());
  }

  public List<ShopZhenkePostComment> comments(long id, int pageNum, int pageSize) {
    detail(id);
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(20, pageSize)));
    List<ShopZhenkePostComment> roots;
    try {
      roots = mapper.selectRootComments(id);
    } finally {
      PageHelper.clearPage();
    }
    attachCommentPreviews(id, roots);
    return roots;
  }

  public List<ShopZhenkePostComment> commentReplies(
      long id, long rootCommentId, int pageNum, int pageSize) {
    detail(id);
    ShopZhenkePostComment root = mapper.selectComment(id, rootCommentId);
    if (root == null || root.getParentCommentId() != null) {
      throw new ServiceException("一级评论不存在或已删除");
    }
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
    try {
      return mapper.selectReplies(id, rootCommentId);
    } finally {
      PageHelper.clearPage();
    }
  }

  @Transactional
  public ShopZhenkePostComment comment(long id, ShopZhenkeCommentBody b) {
    long uid = ShopAccountIdentity.requireShopUserId();
    detail(id);
    ShopZhenkePostComment c = new ShopZhenkePostComment();
    c.setPostId(id);
    c.setShopUserId(uid);
    c.setContent(StringUtils.trim(b.getContent()));
    if (b.getReplyToCommentId() != null) {
      ShopZhenkePostComment target = mapper.selectComment(id, b.getReplyToCommentId());
      if (target == null) throw new ServiceException("回复的评论不存在");
      c.setReplyToCommentId(target.getCommentId());
      c.setParentCommentId(
          target.getParentCommentId() == null
              ? target.getCommentId()
              : target.getParentCommentId());
    }
    if (mapper.insertComment(c) != 1 || c.getCommentId() == null) {
      throw new ServiceException("评论保存失败，请重试");
    }
    ShopZhenkePostComment saved = mapper.selectComment(id, c.getCommentId());
    if (saved == null) throw new ServiceException("评论保存结果异常，请刷新后查看");
    return saved;
  }

  @Transactional
  public void deleteComment(long id, long cid) {
    long uid = ShopAccountIdentity.requireAuthenticatedShopUserId();
    ShopZhenkePostComment c = mapper.selectComment(id, cid);
    if (c == null) throw new ServiceException("评论不存在");
    int n =
        c.getParentCommentId() == null
            ? mapper.deleteCommentTree(id, cid, uid)
            : mapper.deleteComment(id, cid, uid);
    if (n == 0) throw new ServiceException("只能删除自己的评论");
  }

  private void attachCommentPreviews(long postId, List<ShopZhenkePostComment> roots) {
    if (roots == null || roots.isEmpty()) return;
    List<Long> rootIds = roots.stream().map(ShopZhenkePostComment::getCommentId).toList();
    Map<Long, List<ShopZhenkePostComment>> repliesByRoot = new HashMap<>();
    List<ShopZhenkePostComment> previews =
        mapper.selectReplyPreviews(postId, rootIds, COMMENT_PREVIEW_SIZE);
    if (previews != null) {
      for (ShopZhenkePostComment reply : previews) {
        if (reply.getParentCommentId() != null) {
          repliesByRoot
              .computeIfAbsent(reply.getParentCommentId(), ignored -> new ArrayList<>())
              .add(reply);
        }
      }
    }
    for (ShopZhenkePostComment root : roots) {
      root.setReplies(repliesByRoot.getOrDefault(root.getCommentId(), List.of()));
      if (root.getReplyCount() == null) root.setReplyCount(0L);
    }
  }

  public List<com.ruoyi.shop.domain.vo.ShopMerchantOption> merchantOptions(String keyword) {
    String value = StringUtils.trim(keyword);
    if (value.length() > 50) throw new ServiceException("商家搜索关键词不能超过50个字符");
    List<com.ruoyi.shop.domain.vo.ShopMerchantOption> options =
        mapper.selectActiveMerchantOptions(value);
    if (options == null) return List.of();
    return options.stream()
        .filter(Objects::nonNull)
        .filter(option -> option.getMerchantId() != null && option.getMerchantId() > 0)
        .filter(option -> StringUtils.isNotEmpty(StringUtils.trim(option.getShopName())))
        .toList();
  }

  public List<ShopHomeBanner> activeBanners() {
    return mapper.selectActiveBanners();
  }

  public List<ShopHomeBanner> banners() {
    return mapper.selectBanners();
  }

  public List<ShopZhenkePost> adminPosts(
      String keyword,
      Long merchantId,
      String status,
      java.util.Date publishedFrom,
      java.util.Date publishedTo,
      int pageNum,
      int pageSize) {
    String normalizedKeyword = StringUtils.trim(keyword);
    if (normalizedKeyword.length() > 120) throw new ServiceException("帖子搜索关键词不能超过120个字符");
    if (merchantId != null && merchantId <= 0) throw new ServiceException("关联商家筛选无效");
    if (publishedFrom != null && publishedTo != null && publishedTo.before(publishedFrom)) {
      throw new ServiceException("发布时间结束值不能早于开始值");
    }
    String normalizedStatus = StringUtils.trim(status).toUpperCase(Locale.ROOT);
    if (!normalizedStatus.isEmpty() && !Set.of("PUBLISHED", "DELETED").contains(normalizedStatus)) {
      throw new ServiceException("帖子状态筛选无效");
    }
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
    return hydrate(
        mapper.selectPosts(
            "RECOMMEND",
            null,
            null,
            normalizedKeyword,
            merchantId,
            normalizedStatus,
            true,
            publishedFrom,
            publishedTo,
            null,
            null),
        true);
  }

  private String normalizeCity(String city) {
    String normalized = StringUtils.trim(city);
    return normalized.isEmpty() ? null : normalized;
  }

  public ShopZhenkePost adminDetail(long id) {
    ShopZhenkePost p = mapper.selectPost(id, true, null);
    if (p == null) throw new ServiceException("甄客帖不存在");
    p.setResources(mapper.selectResources(id));
    return p;
  }

  @Transactional
  public void adminDelete(long id, long admin) {
    if (mapper.adminDeletePost(id, admin) != 1) throw new ServiceException("帖子不存在或已删除");
  }

  @Transactional
  public ShopHomeBanner saveBanner(Long id, ShopHomeBannerBody b, String user) {
    String persistedStatus = "1";
    if (id != null) {
      ShopHomeBanner existing = mapper.selectBanner(id);
      if (existing == null || !Set.of("0", "1").contains(existing.getStatus())) {
        throw new ServiceException("轮播不存在");
      }
      persistedStatus = existing.getStatus();
    }
    String imagePath = validateBanner(b);
    ShopHomeBanner x = new ShopHomeBanner();
    x.setBannerId(id);
    x.setTitle(StringUtils.trim(b.getTitle()));
    x.setSubtitle(StringUtils.trim(b.getSubtitle()));
    x.setImageUrl(imagePath);
    x.setJumpType(b.getJumpType());
    x.setJumpTarget(StringUtils.trim(b.getJumpTarget()));
    x.setBannerSort(b.getBannerSort());
    // Add/edit permissions do not imply publish permission. Only bannerStatus
    // may change this field, and that endpoint has its own authority check.
    x.setStatus(persistedStatus);
    x.setStartTime(atBannerTime(b.getStartTime(), LocalTime.MIDNIGHT));
    x.setEndTime(atBannerTime(b.getEndTime(), LocalTime.of(23, 59, 59)));
    x.setCreateBy(user);
    x.setUpdateBy(user);
    if (id == null) {
      if (mapper.insertBanner(x) != 1 || x.getBannerId() == null) {
        throw new ServiceException("轮播保存失败，请重试");
      }
    }
    else if (mapper.updateBanner(x) != 1) throw new ServiceException("轮播不存在");
    ShopHomeBanner saved = mapper.selectBanner(x.getBannerId());
    if (saved == null) throw new ServiceException("轮播保存结果异常，请刷新后核对");
    return saved;
  }

  @Transactional
  public void deleteBanner(long id) {
    if (mapper.deleteBanner(id) != 1) throw new ServiceException("轮播不存在");
  }

  @Transactional
  public void bannerStatus(long id, String status, String user) {
    if (!Set.of("0", "1").contains(status) || mapper.updateBannerStatus(id, status, user) != 1)
      throw new ServiceException("轮播状态无效或记录不存在");
  }

  private List<ShopZhenkePost> hydrate(List<ShopZhenkePost> rows, boolean includeDeletedResources) {
    if (rows == null || rows.isEmpty()) return rows;
    List<Long> postIds =
        rows.stream()
            .filter(p -> includeDeletedResources || !"DELETED".equals(p.getStatus()))
            .map(ShopZhenkePost::getPostId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
    Map<Long, List<ShopZhenkePostResource>> resourcesByPost = new HashMap<>();
    if (!postIds.isEmpty()) {
      List<ShopZhenkePostResource> resources = mapper.selectResourcesByPostIds(postIds);
      if (resources != null) {
        for (ShopZhenkePostResource resource : resources) {
          if (resource != null && resource.getPostId() != null) {
            resourcesByPost
                .computeIfAbsent(resource.getPostId(), ignored -> new ArrayList<>())
                .add(resource);
          }
        }
      }
    }
    for (ShopZhenkePost post : rows) {
      post.setResources(
          includeDeletedResources || !"DELETED".equals(post.getStatus())
              ? resourcesByPost.getOrDefault(post.getPostId(), List.of())
              : List.of());
    }
    return rows;
  }

  public ShopPlace resolveSelectedPlace(ShopZhenkePostBody.PlaceSelection s) {
    if (!"TENCENT".equalsIgnoreCase(s.getProvider())) throw new ServiceException("当前仅支持腾讯地图选点结果");
    String providerPlaceId = StringUtils.trim(s.getProviderPlaceId());
    ShopPlace p = mapper.selectPlaceByProvider("TENCENT", providerPlaceId);
    if (p != null) return p;
    Map<String, Object> authoritative = mapService.placeDetail(providerPlaceId);
    if (!providerPlaceId.equals(authoritative.get("providerPlaceId"))) {
      throw new ServiceException("地图地点标识校验失败，请重新选择地点");
    }
    p = new ShopPlace();
    p.setProvider("TENCENT");
    p.setProviderPlaceId(String.valueOf(authoritative.get("providerPlaceId")));
    p.setPlaceName(String.valueOf(authoritative.get("placeName")));
    p.setPlaceType((String) authoritative.get("placeType"));
    p.setAddress(String.valueOf(authoritative.get("address")));
    p.setProvince((String) authoritative.get("province"));
    p.setCity((String) authoritative.get("city"));
    p.setDistrict((String) authoritative.get("district"));
    p.setProvinceCode((String) authoritative.get("provinceCode"));
    p.setCityCode((String) authoritative.get("cityCode"));
    p.setDistrictCode((String) authoritative.get("districtCode"));
    p.setLatitude((java.math.BigDecimal) authoritative.get("latitude"));
    p.setLongitude((java.math.BigDecimal) authoritative.get("longitude"));
    if (mapper.insertPlace(p) != 1) {
      ShopPlace existing = mapper.selectPlaceByProvider("TENCENT", providerPlaceId);
      if (existing == null) throw new ServiceException("地点保存失败，请重新选择");
      return existing;
    }
    return p;
  }

  private void validateResources(List<ShopZhenkePostBody.Resource> rs) {
    long images = rs.stream().filter(x -> "IMAGE".equals(x.getResourceType())).count();
    if (images < 1) throw new ServiceException("请至少上传一张图片作为封面");
    long videos = rs.stream().filter(x -> "VIDEO".equals(x.getResourceType())).count();
    if (videos > 1) throw new ServiceException("最多上传一个视频");
    for (var r : rs) {
      normalizeClaimedResourceUrl(r.getResourceUrl());
    }
  }

  private String normalizeClaimedResourceUrl(String rawUrl) {
    String value = ShopPlatformMediaPathUtils.normalize(rawUrl);
    if (!value.startsWith("/profile/upload/report/user-")) {
      throw new ServiceException("媒体地址无效");
    }
    ShopPlatformMediaPathUtils.requireStoredFile(value);
    return value;
  }

  private String validateBanner(ShopHomeBannerBody b) {
    if ((b.getStartTime() == null) != (b.getEndTime() == null)) {
      throw new ServiceException("请同时选择轮播开始日期和结束日期");
    }
    if (b.getStartTime() != null
        && b.getEndTime().isBefore(b.getStartTime())) {
      throw new ServiceException("轮播结束日期不能早于开始日期");
    }
    String imagePath = normalizeBannerImage(b.getImageUrl());
    String t = StringUtils.trim(b.getJumpTarget());
    if ("INTERNAL".equals(b.getJumpType())) {
      validateInternalRoute(t);
    } else
      try {
        URI u = URI.create(t);
        if (!"https".equalsIgnoreCase(u.getScheme())
            || u.getHost() == null
            || u.getUserInfo() != null)
          throw new ServiceException("外链必须使用完整的 https 地址");
      } catch (IllegalArgumentException e) {
        throw new ServiceException("外链格式无效");
      }
    return imagePath;
  }

  private Date atBannerTime(LocalDate value, LocalTime time) {
    if (value == null) return null;
    return Date.from(value.atTime(time).atZone(ZoneId.systemDefault()).toInstant());
  }

  private void validateInternalRoute(String target) {
    String lowered = target.toLowerCase(Locale.ROOT);
    if (!target.startsWith("/")
        || target.startsWith("//")
        || target.contains("\\")
        || target.chars().anyMatch(ch -> ch < 0x20)
        || lowered.contains("%2f")
        || lowered.contains("%5c")
        || lowered.contains("%2e")) {
      throw new ServiceException("站内跳转必须是正式相对路由");
    }
    try {
      URI route = URI.create(target);
      String path = route.getPath();
      if (route.isAbsolute()
          || route.getRawAuthority() != null
          || path == null
          || !path.startsWith("/")
          || path.equals("/..")
          || path.startsWith("/../")
          || path.contains("/../")
          || path.endsWith("/..")) {
        throw new ServiceException("站内跳转必须是正式相对路由");
      }
    } catch (IllegalArgumentException e) {
      throw new ServiceException("站内跳转格式无效");
    }
  }

  private String normalizeBannerImage(String imageUrl) {
    String value = ShopPlatformMediaPathUtils.normalize(imageUrl);
    String lowerValue = value.toLowerCase(Locale.ROOT);
    if (!value.startsWith("/profile/upload/")
        || !(lowerValue.endsWith(".jpg")
            || lowerValue.endsWith(".jpeg")
            || lowerValue.endsWith(".png"))) {
      throw new ServiceException("轮播图片必须使用平台上传的 JPG 或 PNG 文件");
    }
    ShopPlatformMediaPathUtils.requireStoredImage(value);
    return value;
  }
}
