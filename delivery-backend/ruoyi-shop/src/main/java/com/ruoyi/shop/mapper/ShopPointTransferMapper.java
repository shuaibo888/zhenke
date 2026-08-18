package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopPointTransfer;

public interface ShopPointTransferMapper
{
    int insertTransfer(ShopPointTransfer transfer);

    ShopPointTransfer selectPendingByUserAndSource(@Param("shopUserId") Long shopUserId,
            @Param("sourceSystem") String sourceSystem);

    List<ShopPointTransfer> selectPendingForRetry();

    ShopPointTransfer selectForUpdateByRequestNo(@Param("requestNo") String requestNo);

    int markSuccess(@Param("requestNo") String requestNo, @Param("transferNo") String transferNo);

    int markFailed(@Param("requestNo") String requestNo, @Param("failCode") String failCode,
            @Param("failReason") String failReason);
}
