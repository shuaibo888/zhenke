package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopVerificationReportComment;

public interface ShopVerificationReportCommentMapper
{
    List<ShopVerificationReportComment> selectActiveComments(Long reportId);
    ShopVerificationReportComment selectActiveComment(@Param("reportId") Long reportId,
            @Param("commentId") Long commentId);
    ShopVerificationReportComment selectActiveRootForUpdate(@Param("reportId") Long reportId,
            @Param("commentId") Long commentId);
    int insertComment(ShopVerificationReportComment comment);
    int softDeleteComment(@Param("reportId") Long reportId, @Param("commentId") Long commentId,
            @Param("shopUserId") Long shopUserId);
    int softDeleteCommentTree(@Param("reportId") Long reportId, @Param("rootCommentId") Long rootCommentId,
            @Param("shopUserId") Long shopUserId);
}
