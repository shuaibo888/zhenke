package com.ruoyi.shop.service;

import com.github.pagehelper.PageHelper;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopPlace;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkeEnjoyComment;
import com.ruoyi.shop.domain.dto.ShopZhenkeCommentBody;
import com.ruoyi.shop.domain.dto.ShopZhenkeEnjoyBody;
import com.ruoyi.shop.mapper.ShopZhenkeEnjoyMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.util.ShopPlatformMediaPathUtils;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShopZhenkeEnjoyService {
  private static final Set<String> CATEGORIES = Set.of("MALL", "RESTAURANT", "SCENIC", "HOTEL");
  private static final int COMMENT_PREVIEW_SIZE = 3;
  private final ShopZhenkeEnjoyMapper mapper;
  private final ShopZhenkeService placeService;

  public ShopZhenkeEnjoyService(ShopZhenkeEnjoyMapper mapper, ShopZhenkeService placeService) {
    this.mapper = mapper;
    this.placeService = placeService;
  }

  public List<ShopZhenkeEnjoy> enjoys(String category, int pageNum, int pageSize) {
    return enjoys(category, null, pageNum, pageSize);
  }

  public List<ShopZhenkeEnjoy> enjoys(
      String category, String city, int pageNum, int pageSize) {
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
    return mapper.selectEnjoys(
        normalizeCategory(category),
        null,
        null,
        false,
        ShopAccountIdentity.currentShopUserIdOrNull(),
        normalizeCity(city));
  }

  public List<ShopZhenkeEnjoy> homeEnjoys(String city, int perCategory) {
    return mapper.selectHomeEnjoys(
        normalizeCity(city),
        ShopAccountIdentity.currentShopUserIdOrNull(),
        Math.max(1, Math.min(6, perCategory)));
  }

  public ShopZhenkeEnjoy detail(long enjoyId) {
    ShopZhenkeEnjoy enjoy =
        mapper.selectEnjoy(enjoyId, false, ShopAccountIdentity.currentShopUserIdOrNull());
    if (enjoy == null) throw new ServiceException("甄必享内容不存在或已下线");
    hydrateMedia(enjoy);
    return enjoy;
  }

  @Transactional
  public Map<String, Object> toggleLike(long enjoyId) {
    long userId = ShopAccountIdentity.requireShopUserId();
    detail(enjoyId);
    boolean removing = mapper.countLike(enjoyId, userId) > 0;
    if (removing) {
      mapper.deleteLike(enjoyId, userId);
    } else {
      // INSERT IGNORE may report 0 when another request has already created the
      // same unique relation. Re-read the persisted state instead of reporting
      // a false failure to the user.
      mapper.insertLike(enjoyId, userId);
    }
    boolean liked = mapper.countLike(enjoyId, userId) > 0;
    if (!removing && !liked) {
      throw new ServiceException("点赞失败，请刷新后重试");
    }
    ShopZhenkeEnjoy refreshed = detail(enjoyId);
    return Map.of("liked", liked, "likeCount", refreshed.getLikeCount());
  }

  public List<ShopZhenkeEnjoyComment> comments(long enjoyId, int pageNum, int pageSize) {
    detail(enjoyId);
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(20, pageSize)));
    List<ShopZhenkeEnjoyComment> roots;
    try {
      roots = mapper.selectRootComments(enjoyId);
    } finally {
      PageHelper.clearPage();
    }
    attachCommentPreviews(enjoyId, roots);
    return roots;
  }

  public List<ShopZhenkeEnjoyComment> commentReplies(
      long enjoyId, long rootCommentId, int pageNum, int pageSize) {
    detail(enjoyId);
    ShopZhenkeEnjoyComment root = mapper.selectComment(enjoyId, rootCommentId);
    if (root == null || root.getParentCommentId() != null) {
      throw new ServiceException("一级评论不存在或已删除");
    }
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(20, pageSize)));
    try {
      return mapper.selectReplies(enjoyId, rootCommentId);
    } finally {
      PageHelper.clearPage();
    }
  }

  @Transactional
  public ShopZhenkeEnjoyComment comment(long enjoyId, ShopZhenkeCommentBody body) {
    long userId = ShopAccountIdentity.requireShopUserId();
    detail(enjoyId);
    ShopZhenkeEnjoyComment comment = new ShopZhenkeEnjoyComment();
    comment.setEnjoyId(enjoyId);
    comment.setShopUserId(userId);
    comment.setContent(StringUtils.trim(body.getContent()));
    boolean replying = body.getReplyToCommentId() != null;
    if (replying) comment.setReplyToCommentId(body.getReplyToCommentId());
    int inserted = mapper.insertComment(comment);
    if (inserted != 1 || comment.getCommentId() == null) {
      if (replying && inserted == 0) {
        throw new ServiceException("回复的评论不存在或已删除");
      }
      throw new ServiceException("评论保存失败，请重试");
    }
    ShopZhenkeEnjoyComment saved = mapper.selectComment(enjoyId, comment.getCommentId());
    if (saved == null) throw new ServiceException("评论保存结果异常，请刷新后查看");
    return saved;
  }

  @Transactional
  public void deleteComment(long enjoyId, long commentId) {
    long userId = ShopAccountIdentity.requireAuthenticatedShopUserId();
    ShopZhenkeEnjoyComment comment = mapper.selectComment(enjoyId, commentId);
    if (comment == null) throw new ServiceException("评论不存在");
    int affected =
        comment.getParentCommentId() == null
            ? mapper.deleteCommentTree(enjoyId, commentId, userId)
            : mapper.deleteComment(enjoyId, commentId, userId);
    if (affected == 0) throw new ServiceException("只能删除自己的评论");
  }

  private void attachCommentPreviews(long enjoyId, List<ShopZhenkeEnjoyComment> roots) {
    if (roots == null || roots.isEmpty()) return;
    List<Long> rootIds = roots.stream().map(ShopZhenkeEnjoyComment::getCommentId).toList();
    Map<Long, List<ShopZhenkeEnjoyComment>> repliesByRoot = new HashMap<>();
    List<ShopZhenkeEnjoyComment> previews =
        mapper.selectReplyPreviews(enjoyId, rootIds, COMMENT_PREVIEW_SIZE);
    if (previews != null) {
      for (ShopZhenkeEnjoyComment reply : previews) {
        if (reply.getParentCommentId() != null) {
          repliesByRoot
              .computeIfAbsent(reply.getParentCommentId(), ignored -> new ArrayList<>())
              .add(reply);
        }
      }
    }
    for (ShopZhenkeEnjoyComment root : roots) {
      root.setReplies(repliesByRoot.getOrDefault(root.getCommentId(), List.of()));
      if (root.getReplyCount() == null) root.setReplyCount(0L);
    }
  }

  public List<ShopZhenkeEnjoy> adminEnjoys(
      String keyword, String category, String status, int pageNum, int pageSize) {
    String normalizedKeyword = StringUtils.trim(keyword);
    if (normalizedKeyword.length() > 120) throw new ServiceException("搜索关键词不能超过120个字符");
    String normalizedStatus = StringUtils.trim(status).toUpperCase(Locale.ROOT);
    if (!normalizedStatus.isEmpty() && !Set.of("0", "1", "DELETED").contains(normalizedStatus)) {
      throw new ServiceException("甄必享状态无效");
    }
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
    return mapper.selectEnjoys(
        normalizeCategory(category), normalizedKeyword, normalizedStatus, true, null, null);
  }

  public ShopZhenkeEnjoy adminDetail(long enjoyId) {
    ShopZhenkeEnjoy enjoy = mapper.selectEnjoy(enjoyId, true, null);
    if (enjoy == null) throw new ServiceException("甄必享内容不存在");
    hydrateMedia(enjoy);
    return enjoy;
  }

  @Transactional
  public ShopZhenkeEnjoy save(Long enjoyId, ShopZhenkeEnjoyBody body, String user) {
    String persistedStatus = "1";
    if (enjoyId != null) {
      ShopZhenkeEnjoy existing = mapper.selectEnjoy(enjoyId, true, null);
      if (existing == null || !Set.of("0", "1").contains(existing.getStatus())) {
        throw new ServiceException("甄必享内容不存在或已删除");
      }
      persistedStatus = existing.getStatus();
    }
    ShopPlace place = placeService.resolveSelectedPlace(body.getPlace());
    List<String> mediaUrls = normalizeMediaUrls(body.getMediaUrls());
    ShopZhenkeEnjoy enjoy = new ShopZhenkeEnjoy();
    enjoy.setEnjoyId(enjoyId);
    enjoy.setCategory(normalizeCategory(body.getCategory()));
    enjoy.setTitle(StringUtils.trim(body.getTitle()));
    enjoy.setSubtitle(StringUtils.trim(body.getSubtitle()));
    enjoy.setCoverUrl(mediaUrls.get(0));
    enjoy.setServiceSummary(StringUtils.trim(body.getServiceSummary()));
    enjoy.setContent(StringUtils.trim(body.getContent()));
    enjoy.setHighlights(StringUtils.trim(body.getHighlights()));
    enjoy.setOpeningHours(StringUtils.trim(body.getOpeningHours()));
    enjoy.setContactPhone(StringUtils.trim(body.getContactPhone()));
    enjoy.setPlaceId(place.getPlaceId());
    enjoy.setPlaceName(place.getPlaceName());
    enjoy.setPlaceAddress(place.getAddress());
    enjoy.setDisplaySort(body.getDisplaySort() == null ? 0 : body.getDisplaySort());
    // Creating or editing content must never grant publish privileges. Status is
    // controlled exclusively by the separately-authorized /status endpoint.
    enjoy.setStatus(persistedStatus);
    enjoy.setCreateBy(user);
    enjoy.setUpdateBy(user);
    if (enjoyId == null) {
      if (mapper.insertEnjoy(enjoy) != 1 || enjoy.getEnjoyId() == null) {
        throw new ServiceException("甄必享内容保存失败");
      }
    } else if (mapper.updateEnjoy(enjoy) != 1) {
      throw new ServiceException("甄必享内容不存在或已删除");
    }
    if (enjoyId != null) mapper.deleteMedia(enjoy.getEnjoyId());
    int mediaSort = 1;
    for (String mediaUrl : mediaUrls) {
      if (mapper.insertMedia(enjoy.getEnjoyId(), mediaUrl, mediaSort++) != 1) {
        throw new ServiceException("甄必享图片保存失败，请重试");
      }
    }
    return adminDetail(enjoy.getEnjoyId());
  }

  @Transactional
  public void delete(long enjoyId, String user) {
    if (mapper.deleteEnjoy(enjoyId, user) != 1) throw new ServiceException("甄必享内容不存在或已删除");
  }

  @Transactional
  public void updateStatus(long enjoyId, String status, String user) {
    if ("0".equals(status) && mapper.countPublishReady(enjoyId) != 1) {
      throw new ServiceException("请先完成地点、图片和内容信息后再发布");
    }
    if (!Set.of("0", "1").contains(status)
        || mapper.updateEnjoyStatus(enjoyId, status, user) != 1) {
      throw new ServiceException("甄必享状态无效或内容不存在");
    }
  }

  private String normalizeCategory(String category) {
    String normalized = StringUtils.trim(category).toUpperCase(Locale.ROOT);
    if (normalized.isEmpty()) return null;
    if (!CATEGORIES.contains(normalized)) throw new ServiceException("甄必享分类无效");
    return normalized;
  }

  private String normalizeCity(String city) {
    String normalized = StringUtils.trim(city);
    return normalized.isEmpty() ? null : normalized;
  }

  private List<String> normalizeMediaUrls(List<String> rawValues) {
    if (rawValues == null || rawValues.isEmpty() || rawValues.size() > 9) {
      throw new ServiceException("请上传1至9张地点图片");
    }
    List<String> normalized = rawValues.stream().map(this::normalizeMediaUrl).distinct().toList();
    if (normalized.size() != rawValues.size()) throw new ServiceException("请勿重复上传同一张图片");
    return normalized;
  }

  private String normalizeMediaUrl(String rawValue) {
    String value = ShopPlatformMediaPathUtils.normalize(rawValue);
    String lowerValue = value.toLowerCase(Locale.ROOT);
    if (!value.startsWith("/profile/upload/")
        || !(lowerValue.endsWith(".jpg")
            || lowerValue.endsWith(".jpeg")
            || lowerValue.endsWith(".png"))) {
      throw new ServiceException("图片必须使用平台上传的 JPG 或 PNG 文件");
    }
    ShopPlatformMediaPathUtils.requireStoredImage(value);
    return value;
  }

  private void hydrateMedia(ShopZhenkeEnjoy enjoy) {
    List<String> mediaUrls = mapper.selectMediaUrls(enjoy.getEnjoyId());
    if (mediaUrls != null && !mediaUrls.isEmpty()) {
      enjoy.setMediaUrls(mediaUrls);
    } else if (StringUtils.isNotEmpty(enjoy.getCoverUrl())) {
      enjoy.setMediaUrls(List.of(enjoy.getCoverUrl()));
    } else {
      enjoy.setMediaUrls(List.of());
    }
  }
}
