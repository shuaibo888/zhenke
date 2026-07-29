package com.ruoyi.shop.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopCoupon;
import com.ruoyi.shop.domain.ShopCouponGrant;
import com.ruoyi.shop.domain.ShopCouponMerchant;
import com.ruoyi.shop.domain.ShopUserCoupon;
import com.ruoyi.shop.domain.dto.ShopCouponBody;
import com.ruoyi.shop.domain.dto.ShopCouponGrantBody;
import com.ruoyi.shop.mapper.ShopCouponMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopCouponService
{
    public static final String ENABLED = "ENABLED";
    public static final String DISABLED = "DISABLED";
    private static final String UNUSED = "UNUSED";
    private static final int INSERT_BATCH_SIZE = 500;

    private final ShopCouponMapper couponMapper;

    public ShopCouponService(ShopCouponMapper couponMapper)
    {
        this.couponMapper = couponMapper;
    }

    public List<ShopCoupon> adminList(ShopCoupon query)
    {
        List<ShopCoupon> coupons = couponMapper.selectAdminList(query);
        attachMerchantScopes(coupons);
        return coupons;
    }

    public ShopCoupon detail(long couponId)
    {
        ShopCoupon coupon = requireCoupon(couponMapper.selectById(couponId));
        attachMerchantScopes(List.of(coupon));
        return coupon;
    }

    @Transactional
    public ShopCoupon create(ShopCouponBody body, String operator)
    {
        List<Long> merchantIds = normalizeAndValidate(body);
        ShopCoupon coupon = fromBody(body);
        coupon.setIssuedCount(0);
        coupon.setCreateBy(operator);
        coupon.setUpdateBy(operator);
        couponMapper.insertCoupon(coupon);
        couponMapper.insertMerchantScopes(coupon.getCouponId(), merchantIds);
        return detail(coupon.getCouponId());
    }

    @Transactional
    public ShopCoupon update(long couponId, ShopCouponBody body, String operator)
    {
        ShopCoupon existing = requireCoupon(couponMapper.selectByIdForUpdate(couponId));
        if (existing.getIssuedCount() != null && existing.getIssuedCount() > 0)
        {
            throw new ServiceException("优惠券已下发，不能再修改金额、有效期、库存或适用商家");
        }
        List<Long> merchantIds = normalizeAndValidate(body);
        ShopCoupon coupon = fromBody(body);
        coupon.setCouponId(couponId);
        coupon.setUpdateBy(operator);
        if (couponMapper.updateCoupon(coupon) == 0)
        {
            throw new ServiceException("优惠券状态已变化，请刷新后重试");
        }
        couponMapper.deleteMerchantScopes(couponId);
        couponMapper.insertMerchantScopes(couponId, merchantIds);
        return detail(couponId);
    }

    @Transactional
    public ShopCoupon updateStatus(long couponId, String status, String operator)
    {
        requireCoupon(couponMapper.selectByIdForUpdate(couponId));
        if (!ENABLED.equals(status) && !DISABLED.equals(status))
        {
            throw new ServiceException("优惠券状态无效");
        }
        if (couponMapper.updateStatus(couponId, status, operator) == 0)
        {
            throw new ServiceException("优惠券不存在");
        }
        return detail(couponId);
    }

    @Transactional
    public ShopCouponGrant grant(long couponId, ShopCouponGrantBody body, String operator)
    {
        ShopCoupon coupon = requireCoupon(couponMapper.selectByIdForUpdate(couponId));
        if (!ENABLED.equals(coupon.getStatus()))
        {
            throw new ServiceException("已下架的优惠券不能继续下发");
        }
        if (coupon.getEndTime() == null || !coupon.getEndTime().after(new Date()))
        {
            throw new ServiceException("优惠券已过期，不能继续下发");
        }
        if (couponMapper.countEnabledMerchantScopes(couponId) == 0)
        {
            throw new ServiceException("优惠券当前没有可用的适用商家");
        }

        List<Long> userIds = new ArrayList<>(new LinkedHashSet<>(body.getUserIds()));
        if (userIds.isEmpty() || userIds.size() > 200)
        {
            throw new ServiceException("单次请选择1至200个用户");
        }
        if (couponMapper.countEnabledUsers(userIds) != userIds.size())
        {
            throw new ServiceException("下发用户中存在已停用或不存在的账号，请刷新后重新选择");
        }

        int totalQuantity;
        try
        {
            totalQuantity = Math.multiplyExact(userIds.size(), body.getQuantityPerUser());
        }
        catch (ArithmeticException exception)
        {
            throw new ServiceException("下发数量过大");
        }
        if (couponMapper.reserveStock(couponId, totalQuantity, operator) == 0)
        {
            throw new ServiceException("优惠券库存不足、已下架或已过期，请刷新后重试");
        }

        ShopCouponGrant grant = new ShopCouponGrant();
        grant.setCouponId(couponId);
        grant.setUserCount(userIds.size());
        grant.setQuantityPerUser(body.getQuantityPerUser());
        grant.setTotalQuantity(totalQuantity);
        grant.setGrantType("MANUAL");
        grant.setOperatorId(SecurityUtils.getUserId());
        grant.setOperatorName(operator);
        couponMapper.insertGrant(grant);

        List<ShopUserCoupon> issuedCoupons = new ArrayList<>(totalQuantity);
        for (Long userId : userIds)
        {
            for (int index = 0; index < body.getQuantityPerUser(); index++)
            {
                ShopUserCoupon userCoupon = new ShopUserCoupon();
                userCoupon.setCouponId(couponId);
                userCoupon.setShopUserId(userId);
                userCoupon.setGrantId(grant.getGrantId());
                userCoupon.setCouponCode("CP" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
                userCoupon.setStatus(UNUSED);
                issuedCoupons.add(userCoupon);
            }
        }
        for (int start = 0; start < issuedCoupons.size(); start += INSERT_BATCH_SIZE)
        {
            int end = Math.min(start + INSERT_BATCH_SIZE, issuedCoupons.size());
            couponMapper.insertUserCoupons(issuedCoupons.subList(start, end));
        }
        return grant;
    }

    public List<ShopCouponGrant> grants(long couponId)
    {
        return couponMapper.selectGrants(couponId);
    }

    public List<ShopUserCoupon> myCoupons()
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        List<ShopUserCoupon> coupons = couponMapper.selectUserCoupons(userId);
        attachUserCouponScopes(coupons);
        return coupons;
    }

    public List<ShopUserCoupon> availableCoupons(long merchantId, BigDecimal subtotal)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        if (merchantId <= 0 || subtotal == null || subtotal.signum() <= 0)
        {
            throw new ServiceException("结算商家或金额无效");
        }
        List<ShopUserCoupon> coupons = couponMapper.selectAvailableUserCoupons(userId, merchantId, subtotal);
        attachUserCouponScopes(coupons);
        return coupons;
    }

    ShopUserCoupon lockUsableCoupon(long userId, long userCouponId, long merchantId, BigDecimal subtotal)
    {
        ShopUserCoupon coupon = couponMapper.selectUserCouponForUpdate(userId, userCouponId);
        if (coupon == null)
        {
            throw new ServiceException("优惠券不存在或不属于当前用户");
        }
        if (!UNUSED.equals(coupon.getStatus()))
        {
            throw new ServiceException("优惠券已经使用");
        }
        Date now = new Date();
        if (!ENABLED.equals(coupon.getCouponStatus()))
        {
            throw new ServiceException("优惠券已下架，暂不可使用");
        }
        if (coupon.getStartTime() == null || coupon.getStartTime().after(now))
        {
            throw new ServiceException("优惠券尚未生效");
        }
        if (coupon.getEndTime() == null || !coupon.getEndTime().after(now))
        {
            throw new ServiceException("优惠券已过期");
        }
        if (couponMapper.countCouponMerchant(coupon.getCouponId(), merchantId) == 0)
        {
            throw new ServiceException("优惠券不适用于当前商家");
        }
        if (subtotal.compareTo(coupon.getMinimumSpend()) < 0)
        {
            throw new ServiceException("订单金额未达到优惠券使用门槛");
        }
        if (subtotal.compareTo(coupon.getDiscountAmount()) <= 0)
        {
            throw new ServiceException("优惠金额必须小于订单商品金额");
        }
        return coupon;
    }

    void markUsed(long userId, long userCouponId, long orderId)
    {
        if (couponMapper.markUserCouponUsed(userId, userCouponId, orderId) == 0)
        {
            throw new ServiceException("优惠券状态已变化，请重新选择");
        }
    }

    void releaseByOrder(long orderId)
    {
        couponMapper.releaseUserCouponByOrder(orderId);
    }

    private List<Long> normalizeAndValidate(ShopCouponBody body)
    {
        if (!body.getEndTime().after(body.getStartTime()))
        {
            throw new ServiceException("结束时间必须晚于开始时间");
        }
        if (body.getMinimumSpend().signum() > 0
                && body.getDiscountAmount().compareTo(body.getMinimumSpend()) > 0)
        {
            throw new ServiceException("优惠金额不能大于最低消费金额");
        }
        List<Long> merchantIds = new ArrayList<>(new LinkedHashSet<>(body.getMerchantIds()));
        if (merchantIds.isEmpty() || merchantIds.size() > 200)
        {
            throw new ServiceException("请指定1至200个适用商家");
        }
        if (couponMapper.countEnabledMerchants(merchantIds) != merchantIds.size())
        {
            throw new ServiceException("适用商家中存在未通过审核、已停用或不存在的商家");
        }
        return merchantIds;
    }

    private ShopCoupon fromBody(ShopCouponBody body)
    {
        ShopCoupon coupon = new ShopCoupon();
        coupon.setCouponName(StringUtils.trim(body.getCouponName()));
        coupon.setDescription(StringUtils.trim(body.getDescription()));
        coupon.setDiscountAmount(body.getDiscountAmount());
        coupon.setMinimumSpend(body.getMinimumSpend());
        coupon.setStartTime(body.getStartTime());
        coupon.setEndTime(body.getEndTime());
        coupon.setStatus(body.getStatus());
        coupon.setTotalStock(body.getTotalStock());
        return coupon;
    }

    private ShopCoupon requireCoupon(ShopCoupon coupon)
    {
        if (coupon == null)
        {
            throw new ServiceException("优惠券不存在");
        }
        return coupon;
    }

    private void attachMerchantScopes(List<ShopCoupon> coupons)
    {
        if (coupons == null || coupons.isEmpty())
        {
            return;
        }
        List<Long> couponIds = coupons.stream().map(ShopCoupon::getCouponId).toList();
        Map<Long, List<ShopCouponMerchant>> grouped = couponMapper.selectMerchantScopes(couponIds)
                .stream()
                .collect(Collectors.groupingBy(ShopCouponMerchant::getCouponId));
        coupons.forEach(coupon -> coupon.setMerchants(
                grouped.getOrDefault(coupon.getCouponId(), List.of())));
    }

    private void attachUserCouponScopes(List<ShopUserCoupon> coupons)
    {
        if (coupons == null || coupons.isEmpty())
        {
            return;
        }
        List<Long> couponIds = coupons.stream().map(ShopUserCoupon::getCouponId).distinct().toList();
        Map<Long, List<ShopCouponMerchant>> grouped = couponMapper.selectMerchantScopes(couponIds)
                .stream()
                .collect(Collectors.groupingBy(ShopCouponMerchant::getCouponId));
        coupons.forEach(coupon -> coupon.setMerchants(
                grouped.getOrDefault(coupon.getCouponId(), List.of())));
    }
}
