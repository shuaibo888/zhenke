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
}
