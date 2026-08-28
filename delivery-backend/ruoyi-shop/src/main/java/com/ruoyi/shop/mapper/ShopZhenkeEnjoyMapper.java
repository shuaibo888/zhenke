package com.ruoyi.shop.mapper;

import com.ruoyi.shop.domain.ShopZhenkeEnjoy;
import com.ruoyi.shop.domain.ShopZhenkeEnjoyComment;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface ShopZhenkeEnjoyMapper {
  List<ShopZhenkeEnjoy> selectEnjoys(
      @Param("category") String category,
      @Param("keyword") String keyword,
      @Param("status") String status,
      @Param("includeDeleted") boolean includeDeleted,
      @Param("currentUserId") Long currentUserId);

  ShopZhenkeEnjoy selectEnjoy(
      @Param("enjoyId") Long enjoyId,
      @Param("includeDeleted") boolean includeDeleted,
      @Param("currentUserId") Long currentUserId);

  int insertEnjoy(ShopZhenkeEnjoy enjoy);
  int updateEnjoy(ShopZhenkeEnjoy enjoy);
  int deleteEnjoy(@Param("enjoyId") Long enjoyId, @Param("user") String user);
  int updateEnjoyStatus(
      @Param("enjoyId") Long enjoyId, @Param("status") String status, @Param("user") String user);

  int insertLike(@Param("enjoyId") Long enjoyId, @Param("shopUserId") Long shopUserId);
  int deleteLike(@Param("enjoyId") Long enjoyId, @Param("shopUserId") Long shopUserId);
  int countLike(@Param("enjoyId") Long enjoyId, @Param("shopUserId") Long shopUserId);

  List<ShopZhenkeEnjoyComment> selectComments(Long enjoyId);
  ShopZhenkeEnjoyComment selectComment(
      @Param("enjoyId") Long enjoyId, @Param("commentId") Long commentId);
  int insertComment(ShopZhenkeEnjoyComment comment);
  int deleteComment(
      @Param("enjoyId") Long enjoyId,
      @Param("commentId") Long commentId,
      @Param("shopUserId") Long shopUserId);
  int deleteCommentTree(
      @Param("enjoyId") Long enjoyId,
      @Param("commentId") Long commentId,
      @Param("shopUserId") Long shopUserId);
}
