package com.ruoyi.shop.service;

import com.github.pagehelper.PageHelper;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.vo.ShopUserOverviewVo;
import com.ruoyi.shop.domain.vo.ShopUsefulContentView;
import com.ruoyi.shop.mapper.ShopCouponMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopZhenkeMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopUserOverviewService
{
    private static final Set<String> USEFUL_CONTENT_TYPES = Set.of("POST", "REPORT");
    private final ShopOrderMapper orderMapper;
    private final ShopTrialMapper trialMapper;
    private final ShopZhenkeMapper zhenkeMapper;
    private final ShopCouponMapper couponMapper;
    private final ShopPointService pointService;
    private final ShopPublicMediaService publicMedia;

    public ShopUserOverviewService(ShopOrderMapper orderMapper, ShopTrialMapper trialMapper,
            ShopZhenkeMapper zhenkeMapper, ShopCouponMapper couponMapper,
            ShopPointService pointService, ShopPublicMediaService publicMedia)
    {
        this.orderMapper = orderMapper;
        this.trialMapper = trialMapper;
        this.zhenkeMapper = zhenkeMapper;
        this.couponMapper = couponMapper;
        this.pointService = pointService;
        this.publicMedia = publicMedia;
    }

    public ShopUserOverviewVo overview()
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        int orderCount = orderMapper.countUserOrders(shopUserId);
        int trialCount = trialMapper.countUserApplications(shopUserId);
        int reportCount = trialMapper.countPublishedReportsByUser(shopUserId);
        int couponAvailableCount = couponMapper.countAvailableUserCoupons(shopUserId);
        long pointsBalance = pointService.mySummary().getBalance();
        int postUsefulReceivedCount = zhenkeMapper.countUsefulReceivedByAuthor(shopUserId);
        int reportUsefulReceivedCount = trialMapper.countUsefulReceivedByUser(shopUserId);

        ShopUserOverviewVo vo = new ShopUserOverviewVo();
        vo.setOrderCount((long) orderCount);
        vo.setTrialCount((long) trialCount);
        vo.setReportCount((long) reportCount);
        vo.setCouponAvailableCount((long) couponAvailableCount);
        vo.setPointsBalance(pointsBalance);
        vo.setPostUsefulReceivedCount((long) postUsefulReceivedCount);
        vo.setReportUsefulReceivedCount((long) reportUsefulReceivedCount);
        vo.setTotalUsefulReceivedCount(
                (long) postUsefulReceivedCount + (long) reportUsefulReceivedCount);
        if (vo.getOrderCount() < 0 || vo.getTrialCount() < 0 || vo.getReportCount() < 0
                || vo.getCouponAvailableCount() < 0 || vo.getPointsBalance() < 0
                || vo.getPostUsefulReceivedCount() < 0 || vo.getReportUsefulReceivedCount() < 0)
        {
            throw new ServiceException("个人中心汇总数据异常，请联系管理员");
        }
        return vo;
    }

    public List<ShopUsefulContentView> usefulContent(String type, int pageNum, int pageSize)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        String normalizedType = StringUtils.trim(type).toUpperCase(Locale.ROOT);
        if (!USEFUL_CONTENT_TYPES.contains(normalizedType))
        {
            throw new ServiceException("有用内容类型无效");
        }
        PageHelper.startPage(Math.max(1, pageNum), Math.max(1, Math.min(50, pageSize)));
        List<ShopUsefulContentView> rows = "POST".equals(normalizedType)
                ? zhenkeMapper.selectUsefulContentByAuthor(shopUserId)
                : trialMapper.selectUsefulContentByUser(shopUserId);
        rows.forEach(item -> item.setCoverUrl(publicMedia.publicUrl(item.getCoverUrl())));
        return rows;
    }
}
