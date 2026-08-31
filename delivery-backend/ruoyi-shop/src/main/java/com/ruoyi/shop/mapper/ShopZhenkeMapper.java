package com.ruoyi.shop.mapper;

import com.ruoyi.shop.domain.*;
import com.ruoyi.shop.domain.vo.ShopMerchantOption;
import java.util.Date;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface ShopZhenkeMapper {
  ShopPlace selectPlaceByProvider(
      @Param("provider") String provider, @Param("providerPlaceId") String providerPlaceId);

  ShopPlace selectPlace(Long placeId);

  int insertPlace(ShopPlace place);

  List<ShopZhenkePost> selectPosts(
      @Param("perspectiveFilter") String perspectiveFilter,
      @Param("authorId") Long authorId,
      @Param("placeId") Long placeId,
      @Param("keyword") String keyword,
      @Param("merchantId") Long merchantId,
      @Param("status") String status,
      @Param("includeDeleted") boolean includeDeleted,
      @Param("publishedFrom") Date publishedFrom,
      @Param("publishedTo") Date publishedTo,
      @Param("currentUserId") Long currentUserId,
      @Param("city") String city);

  ShopZhenkePost selectPost(
      @Param("postId") Long postId,
      @Param("includeDeleted") boolean includeDeleted,
      @Param("currentUserId") Long currentUserId);

  List<ShopZhenkePostResource> selectResources(Long postId);

  List<ShopZhenkePostResource> selectResourcesByPostIds(
      @Param("postIds") List<Long> postIds);

  int insertPost(ShopZhenkePost post);

  int insertResource(ShopZhenkePostResource resource);

  int insertPendingUpload(
      @Param("shopUserId") Long shopUserId,
      @Param("resourceUrl") String resourceUrl,
      @Param("resourceType") String resourceType);

  int claimPendingUpload(
      @Param("shopUserId") Long shopUserId,
      @Param("resourceUrl") String resourceUrl,
      @Param("resourceType") String resourceType,
      @Param("postId") Long postId);

  int deleteOwnPost(@Param("postId") Long postId, @Param("shopUserId") Long shopUserId);

  int adminDeletePost(@Param("postId") Long postId, @Param("adminId") Long adminId);

  int insertUseful(@Param("postId") Long postId, @Param("shopUserId") Long shopUserId);

  int deleteUseful(@Param("postId") Long postId, @Param("shopUserId") Long shopUserId);

  int countUseful(@Param("postId") Long postId, @Param("shopUserId") Long shopUserId);

  List<ShopZhenkePostComment> selectRootComments(Long postId);

  List<ShopZhenkePostComment> selectReplyPreviews(
      @Param("postId") Long postId,
      @Param("rootCommentIds") List<Long> rootCommentIds,
      @Param("previewSize") int previewSize);

  List<ShopZhenkePostComment> selectReplies(
      @Param("postId") Long postId, @Param("rootCommentId") Long rootCommentId);

  ShopZhenkePostComment selectComment(
      @Param("postId") Long postId, @Param("commentId") Long commentId);

  int insertComment(ShopZhenkePostComment c);

  int deleteComment(
      @Param("postId") Long postId,
      @Param("commentId") Long commentId,
      @Param("shopUserId") Long shopUserId);

  int deleteCommentTree(
      @Param("postId") Long postId,
      @Param("commentId") Long commentId,
      @Param("shopUserId") Long shopUserId);

  List<ShopHomeBanner> selectActiveBanners();

  List<ShopHomeBanner> selectBanners();

  ShopHomeBanner selectBanner(Long id);

  int insertBanner(ShopHomeBanner b);

  int updateBanner(ShopHomeBanner b);

  int deleteBanner(Long id);

  int updateBannerStatus(
      @Param("id") Long id, @Param("status") String status, @Param("user") String user);

  int countActiveMerchant(Long merchantId);

  List<ShopMerchantOption> selectActiveMerchantOptions(@Param("keyword") String keyword);
}
