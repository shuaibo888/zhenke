package com.ruoyi.shop.service;

import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.vo.ShopUserOverviewVo;
import com.ruoyi.shop.mapper.ShopCouponMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopUserOverviewService
{
    private final ShopOrderMapper orderMapper;
    private final ShopTrialMapper trialMapper;
    private final ShopCouponMapper couponMapper;
    private final ShopPointService pointService;

    public ShopUserOverviewService(ShopOrderMapper orderMapper, ShopTrialMapper trialMapper,
            ShopCouponMapper couponMapper, ShopPointService pointService)
    {
        this.orderMapper = orderMapper;
        this.trialMapper = trialMapper;
        this.couponMapper = couponMapper;
        this.pointService = pointService;
    }

    public ShopUserOverviewVo overview()
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        int orderCount = orderMapper.countUserOrders(shopUserId);
        int trialCount = trialMapper.countUserApplications(shopUserId);
        int reportCount = trialMapper.countPublishedReportsByUser(shopUserId);
        int couponAvailableCount = couponMapper.countAvailableUserCoupons(shopUserId);
        long pointsBalance = pointService.mySummary().getBalance();

        ShopUserOverviewVo vo = new ShopUserOverviewVo();
        vo.setOrderCount((long) orderCount);
        vo.setTrialCount((long) trialCount);
        vo.setReportCount((long) reportCount);
        vo.setCouponAvailableCount((long) couponAvailableCount);
        vo.setPointsBalance(pointsBalance);
        if (vo.getOrderCount() < 0 || vo.getTrialCount() < 0 || vo.getReportCount() < 0
                || vo.getCouponAvailableCount() < 0 || vo.getPointsBalance() < 0)
        {
            throw new ServiceException("个人中心汇总数据异常，请联系管理员");
        }
        return vo;
    }
}
