package com.ruoyi.shop.service;

import com.github.pagehelper.PageHelper;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkeEnjoyComment;
import com.ruoyi.shop.domain.dto.ShopZhenkeCommentBody;
import com.ruoyi.shop.domain.dto.ShopZhenkeEnjoyBody;
import com.ruoyi.shop.mapper.ShopZhenkeEnjoyMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShopZhenkeEnjoyService {
  private static final Set<String> CATEGORIES = Set.of("MALL", "RESTAURANT", "SCENIC", "HOTEL");
  private final ShopZhenkeEnjoyMapper mapper;

  public ShopZhenkeEnjoyService(ShopZhenkeEnjoyMapper mapper) {
    this.mapper = mapper;
  }

  public List<ShopZhenkeEnjoy> enjoys(String category, int pageNum, int pageSize) {
    PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
    return mapper.selectEnjoys(
        normalizeCategory(category), null, null, false, ShopAccountIdentity.currentShopUserIdOrNull());
  }

  public ShopZhenkeEnjoy detail(long enjoyId) {
    ShopZhenkeEnjoy enjoy =
        mapper.selectEnjoy(enjoyId, false, ShopAccountIdentity.currentShopUserIdOrNull());
    if (enjoy == null) throw new ServiceException("甄必享内容不存在或已下线");
    return enjoy;
  }

  @Transactional
  public Map<String, Object> toggleLike(long enjoyId) {
    long userId = ShopAccountIdentity.requireShopUserId();
    detail(enjoyId);
    if (mapper.countLike(enjoyId, userId) > 0) {
      mapper.deleteLike(enjoyId, userId);
    } else if (mapper.insertLike(enjoyId, userId) != 1) {
      throw new ServiceException("点赞失败，请刷新后重试");
    }
    boolean liked = mapper.countLike(enjoyId, userId) > 0;
    ShopZhenkeEnjoy refreshed = detail(enjoyId);
    return Map.of("liked", liked, "likeCount", refreshed.getLikeCount());
  }

  public List<ShopZhenkeEnjoyComment> comments(long enjoyId) {
    detail(enjoyId);
    return mapper.selectComments(enjoyId);
  }

  @Transactional
  public ShopZhenkeEnjoyComment comment(long enjoyId, ShopZhenkeCommentBody body) {
    long userId = ShopAccountIdentity.requireShopUserId();
    detail(enjoyId);
    ShopZhenkeEnjoyComment comment = new ShopZhenkeEnjoyComment();
    comment.setEnjoyId(enjoyId);
    comment.setShopUserId(userId);
    comment.setContent(StringUtils.trim(body.getContent()));
    if (body.getReplyToCommentId() != null) {
      ShopZhenkeEnjoyComment target = mapper.selectComment(enjoyId, body.getReplyToCommentId());
      if (target == null) throw new ServiceException("回复的评论不存在");
      comment.setReplyToCommentId(target.getCommentId());
      comment.setParentCommentId(
          target.getParentCommentId() == null ? target.getCommentId() : target.getParentCommentId());
    }
    if (mapper.insertComment(comment) != 1 || comment.getCommentId() == null) {
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
        normalizeCategory(category), normalizedKeyword, normalizedStatus, true, null);
  }

  public ShopZhenkeEnjoy adminDetail(long enjoyId) {
    ShopZhenkeEnjoy enjoy = mapper.selectEnjoy(enjoyId, true, null);
    if (enjoy == null) throw new ServiceException("甄必享内容不存在");
    return enjoy;
  }

  @Transactional
  public ShopZhenkeEnjoy save(Long enjoyId, ShopZhenkeEnjoyBody body, String user) {
    ShopZhenkeEnjoy enjoy = new ShopZhenkeEnjoy();
    enjoy.setEnjoyId(enjoyId);
    enjoy.setCategory(normalizeCategory(body.getCategory()));
    enjoy.setTitle(StringUtils.trim(body.getTitle()));
    enjoy.setSubtitle(StringUtils.trim(body.getSubtitle()));
    enjoy.setCoverUrl(normalizeCoverUrl(body.getCoverUrl()));
    enjoy.setContent(StringUtils.trim(body.getContent()));
    enjoy.setHighlights(StringUtils.trim(body.getHighlights()));
    enjoy.setPlaceName(StringUtils.trim(body.getPlaceName()));
    enjoy.setPlaceAddress(StringUtils.trim(body.getPlaceAddress()));
    enjoy.setDisplaySort(body.getDisplaySort() == null ? 0 : body.getDisplaySort());
    enjoy.setStatus(body.getStatus());
    enjoy.setCreateBy(user);
    enjoy.setUpdateBy(user);
    if (enjoyId == null) {
      if (mapper.insertEnjoy(enjoy) != 1 || enjoy.getEnjoyId() == null) {
        throw new ServiceException("甄必享内容保存失败");
      }
    } else if (mapper.updateEnjoy(enjoy) != 1) {
      throw new ServiceException("甄必享内容不存在或已删除");
    }
    return adminDetail(enjoy.getEnjoyId());
  }

  @Transactional
  public void delete(long enjoyId, String user) {
    if (mapper.deleteEnjoy(enjoyId, user) != 1) throw new ServiceException("甄必享内容不存在或已删除");
  }

  @Transactional
  public void updateStatus(long enjoyId, String status, String user) {
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

  private String normalizeCoverUrl(String rawValue) {
    String value = StringUtils.trim(rawValue).replace('\\', '/');
    if (value.startsWith("/profile/upload/") && !value.contains("..")) return value;
    try {
      URI uri = URI.create(value);
      if (!"https".equalsIgnoreCase(uri.getScheme())
          || uri.getHost() == null
          || uri.getUserInfo() != null) {
        throw new ServiceException("封面必须使用平台上传地址或 HTTPS 图片地址");
      }
      return value;
    } catch (IllegalArgumentException e) {
      throw new ServiceException("封面图片地址格式无效");
    }
  }
}
