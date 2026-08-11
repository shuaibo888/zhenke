package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopPointRecord;
import com.ruoyi.shop.domain.vo.ShopPointBalance;

public interface ShopPointMapper
{
    ShopPointBalance selectUserSummary(Long shopUserId);

    List<ShopPointRecord> selectUserRecords(Long shopUserId);

    int insertDefaultAccount(@Param("shopUserId") Long shopUserId,
            @Param("createBy") String createBy);

    Long selectBalanceForUpdate(Long shopUserId);

    int consumePoints(@Param("shopUserId") Long shopUserId, @Param("points") Long points);

    int insertConsumeRecord(@Param("shopUserId") Long shopUserId,
            @Param("points") Long points, @Param("balanceAfter") Long balanceAfter,
            @Param("changeReason") String changeReason, @Param("sourceEventId") String sourceEventId,
            @Param("businessId") String businessId);
}
