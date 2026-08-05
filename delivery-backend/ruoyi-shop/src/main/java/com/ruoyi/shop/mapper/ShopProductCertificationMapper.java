package com.ruoyi.shop.mapper;

import java.util.Date;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopProductCertification;
import com.ruoyi.shop.domain.ShopProductCertificationMaterial;

public interface ShopProductCertificationMapper
{
    ShopProductCertification selectLatestForMerchant(@Param("merchantId") Long merchantId,
            @Param("productId") Long productId);
    ShopProductCertification selectCurrentForProduct(@Param("merchantId") Long merchantId,
            @Param("productId") Long productId);
    ShopProductCertification selectById(Long certificationId);
    ShopProductCertification selectForProcessing(Long certificationId);
    List<ShopProductCertificationMaterial> selectMaterials(Long certificationId);
    ShopProductCertificationMaterial selectMaterialForMerchant(@Param("merchantId") Long merchantId,
            @Param("productId") Long productId, @Param("materialId") Long materialId);
    ShopProductCertificationMaterial selectReusableMaterial(@Param("certificationId") Long certificationId,
            @Param("merchantId") Long merchantId, @Param("productId") Long productId,
            @Param("materialId") Long materialId, @Param("materialKind") String materialKind);
    int clearCurrent(@Param("merchantId") Long merchantId, @Param("productId") Long productId);
    int insertCertification(ShopProductCertification certification);
    int insertMaterial(ShopProductCertificationMaterial material);
    int updateInputHash(@Param("certificationId") Long certificationId,
            @Param("inputHash") String inputHash);
    List<Long> selectProcessingCandidates(@Param("limit") int limit,
            @Param("staleBefore") Date staleBefore);
    int claimProcessing(@Param("certificationId") Long certificationId,
            @Param("lockedAt") Date lockedAt, @Param("staleBefore") Date staleBefore,
            @Param("aiProvider") String aiProvider, @Param("aiModel") String aiModel,
            @Param("promptVersion") String promptVersion);
    int completeCertification(ShopProductCertification certification);
    int scheduleRetry(@Param("certificationId") Long certificationId,
            @Param("lastError") String lastError, @Param("nextRetryAt") Date nextRetryAt);
    List<Long> selectExpiredPassedIds(@Param("limit") int limit);
    int expirePassedById(Long certificationId);
    int expireForProductChange(@Param("merchantId") Long merchantId,
            @Param("productId") Long productId, @Param("operator") String operator);
    int insertLog(@Param("certificationId") Long certificationId,
            @Param("tenantId") Long tenantId, @Param("merchantId") Long merchantId,
            @Param("productId") Long productId, @Param("eventType") String eventType,
            @Param("fromStatus") String fromStatus, @Param("toStatus") String toStatus,
            @Param("eventReason") String eventReason, @Param("inputHash") String inputHash,
            @Param("aiProvider") String aiProvider, @Param("aiModel") String aiModel,
            @Param("promptVersion") String promptVersion,
            @Param("operatorType") String operatorType, @Param("operatorName") String operatorName);
}
