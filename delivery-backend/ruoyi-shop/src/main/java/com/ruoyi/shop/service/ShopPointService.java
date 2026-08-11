package com.ruoyi.shop.service;

import java.util.List;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopPointRecord;
import com.ruoyi.shop.domain.vo.ShopPointBalance;
import com.ruoyi.shop.mapper.ShopPointMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopPointService
{
    private final ShopPointMapper pointMapper;

    public ShopPointService(ShopPointMapper pointMapper)
    {
        this.pointMapper = pointMapper;
    }

    public ShopPointBalance mySummary()
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        ShopPointBalance summary = pointMapper.selectUserSummary(shopUserId);
        if (summary == null)
        {
            throw new ServiceException("商城用户不存在或已停用");
        }
        if (summary.getBalance() == null || summary.getTotalTransferredIn() == null
                || summary.getTotalConsumed() == null
                || summary.getBalance() < 0 || summary.getTotalTransferredIn() < 0
                || summary.getTotalConsumed() < 0)
        {
            throw new ServiceException("积分账户数据异常，请联系管理员");
        }
        return summary;
    }

    public List<ShopPointRecord> myRecords(int pageNum, int pageSize)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        int safePageNum = Math.max(pageNum, 1);
        int safePageSize = Math.max(1, Math.min(pageSize, 50));
        PageHelper.startPage(safePageNum, safePageSize);
        return pointMapper.selectUserRecords(shopUserId);
    }

    long consumeForCoupon(long shopUserId, long points, long couponId, String couponName)
    {
        if (points <= 0)
        {
            throw new ServiceException("优惠券积分兑换价格无效");
        }
        Long balance = pointMapper.selectBalanceForUpdate(shopUserId);
        if (balance == null)
        {
            throw new ServiceException("积分账户不存在或当前用户已停用");
        }
        if (balance < points)
        {
            throw new ServiceException("积分不足，无法兑换该优惠券");
        }
        if (pointMapper.consumePoints(shopUserId, points) == 0)
        {
            throw new ServiceException("积分余额已变化，请刷新后重试");
        }
        long balanceAfter = balance - points;
        String sourceEventId = "COUPON_EXCHANGE:" + couponId + ":" + shopUserId;
        if (pointMapper.insertConsumeRecord(shopUserId, points, balanceAfter,
                "积分兑换优惠券：" + couponName, sourceEventId, String.valueOf(couponId)) == 0)
        {
            throw new ServiceException("积分兑换流水记录失败");
        }
        return balanceAfter;
    }
}
