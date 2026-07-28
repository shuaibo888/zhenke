package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.vo.ShopDashboardCount;
import com.ruoyi.shop.domain.vo.ShopDashboardDailyCount;
import com.ruoyi.shop.domain.vo.ShopDashboardSummary;

public interface ShopDashboardMapper
{
    ShopDashboardSummary selectSummary(@Param("merchantId") Long merchantId);
    List<ShopDashboardCount> selectOrderStatusCounts(@Param("merchantId") Long merchantId);
    List<ShopDashboardCount> selectProductStatusCounts(@Param("merchantId") Long merchantId);
    List<ShopDashboardDailyCount> selectOrderDailyCounts(@Param("merchantId") Long merchantId);
}
