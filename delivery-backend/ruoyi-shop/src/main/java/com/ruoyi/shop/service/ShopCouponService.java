package com.ruoyi.shop.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
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
import com.ruoyi.shop.domain.ShopCouponRedemption;
import com.ruoyi.shop.domain.ShopUserCoupon;
import com.ruoyi.shop.domain.dto.ShopCouponBody;
import com.ruoyi.shop.domain.dto.ShopCouponGrantBody;
import com.ruoyi.shop.domain.dto.ShopCouponRedeemBody;
import com.ruoyi.shop.mapper.ShopCouponMapper;
import com.ruoyi.shop.domain.vo.ShopCouponUserOption;
import com.ruoyi.shop.domain.vo.ShopCouponExchangeOption;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopCouponService
{
    public static final String ENABLED = "ENABLED";
    public static final String DISABLED = "DISABLED";
    public static final String MERCHANT_SPECIFIC = "MERCHANT_SPECIFIC";
    public static final String PLATFORM_WIDE = "PLATFORM_WIDE";
    public static final String USAGE_ORDER = "ORDER";
    public static final String USAGE_OFFLINE = "OFFLINE";
    public static final String USAGE_BOTH = "BOTH";
    private static final String UNUSED = "UNUSED";
    private static final int INSERT_BATCH_SIZE = 500;

    private final ShopCouponMapper couponMapper;
    private final ShopMerchantService merchantService;
    private final ShopPointService pointService;

    public ShopCouponService(ShopCouponMapper couponMapper, ShopMerchantService merchantService,
            ShopPointService pointService)
    {
        this.couponMapper = couponMapper;
        this.merchantService = merchantService;
        this.pointService = pointService;
    }

    public List<ShopCoupon> adminList(ShopCoupon query)
    {
        List<ShopCoupon> coupons = couponMapper.selectAdminList(query);
        attachMerchantScopes(coupons);
        return coupons;
    }

    public List<ShopCoupon> merchantList(long merchantId, ShopCoupon query)
    {
        List<ShopCoupon> coupons = couponMapper.selectMerchantList(merchantId, query);
        attachMerchantScopes(coupons);
        return coupons;
    }

    public List<ShopCouponUserOption> merchantUserOptions(String keyword)
    {
        String normalized = StringUtils.trim(keyword);
        if (StringUtils.isNotEmpty(normalized) && normalized.length() > 50)
        {
            throw new ServiceException("用户搜索关键词不能超过50个字符");
        }
        return couponMapper.selectEnabledUserOptions(normalized);
    }

    public ShopCoupon detail(long couponId)
    {
        ShopCoupon coupon = requireCoupon(couponMapper.selectById(couponId));
        attachMerchantScopes(List.of(coupon));
        return coupon;
    }

    public ShopCoupon merchantDetail(long couponId)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        ShopCoupon coupon = requireCoupon(couponMapper.selectMerchantOwnedById(merchantId, couponId));
        attachMerchantScopes(List.of(coupon));
        return coupon;
    }

    @Transactional
    public ShopCoupon create(ShopCouponBody body, String operator)
    {
        String scopeType = normalizeAdminScopeType(body);
        List<Long> merchantIds = PLATFORM_WIDE.equals(scopeType)
                ? List.of() : normalizeAdminMerchantIds(body);
        ShopCoupon coupon = fromBody(body, scopeType);
        coupon.setScopeType(scopeType);
        coupon.setPointsCost(PLATFORM_WIDE.equals(scopeType) ? body.getPointsCost() : null);
        coupon.setIssuedCount(0);
        coupon.setCreateBy(operator);
        coupon.setUpdateBy(operator);
        couponMapper.insertCoupon(coupon);
        if (!merchantIds.isEmpty())
        {
            couponMapper.insertMerchantScopes(coupon.getCouponId(), merchantIds);
        }
        return detail(coupon.getCouponId());
    }

    @Transactional
    public ShopCoupon merchantCreate(ShopCouponBody body, String operator)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        validateMerchantBody(body);
        validateCommon(body, MERCHANT_SPECIFIC);
        if (couponMapper.countEnabledMerchants(List.of(merchantId)) != 1)
        {
            throw new ServiceException("当前商家未启用，不能创建优惠券");
        }
        ShopCoupon coupon = fromBody(body, MERCHANT_SPECIFIC);
        coupon.setOwnerMerchantId(merchantId);
        coupon.setScopeType(MERCHANT_SPECIFIC);
        coupon.setPointsCost(null);
        coupon.setIssuedCount(0);
        coupon.setCreateBy(operator);
        coupon.setUpdateBy(operator);
        couponMapper.insertCoupon(coupon);
        couponMapper.insertMerchantScopes(coupon.getCouponId(), List.of(merchantId));
        return merchantDetail(coupon.getCouponId());
    }

    @Transactional
    public ShopCoupon update(long couponId, ShopCouponBody body, String operator)
    {
        ShopCoupon existing = requireCoupon(couponMapper.selectByIdForUpdate(couponId));
        if (existing.getIssuedCount() != null && existing.getIssuedCount() > 0)
        {
            throw new ServiceException("优惠券已下发，不能再修改金额、有效期、库存或适用商家");
        }
        String scopeType = existing.getOwnerMerchantId() == null
                ? normalizeAdminScopeType(body) : MERCHANT_SPECIFIC;
        List<Long> merchantIds = existing.getOwnerMerchantId() != null
                ? List.of(existing.getOwnerMerchantId())
                : PLATFORM_WIDE.equals(scopeType) ? List.of() : normalizeAdminMerchantIds(body);
        ShopCoupon coupon = fromBody(body, scopeType);
        coupon.setCouponId(couponId);
        coupon.setScopeType(scopeType);
        coupon.setPointsCost(PLATFORM_WIDE.equals(scopeType) ? body.getPointsCost() : null);
        coupon.setUpdateBy(operator);
        if (couponMapper.updateCoupon(coupon) == 0)
        {
            throw new ServiceException("优惠券状态已变化，请刷新后重试");
        }
        couponMapper.deleteMerchantScopes(couponId);
        if (!merchantIds.isEmpty())
        {
            couponMapper.insertMerchantScopes(couponId, merchantIds);
        }
        return detail(couponId);
    }

    @Transactional
    public ShopCoupon merchantUpdate(long couponId, ShopCouponBody body, String operator)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        ShopCoupon existing = requireCoupon(
                couponMapper.selectMerchantOwnedByIdForUpdate(merchantId, couponId));
        if (existing.getIssuedCount() != null && existing.getIssuedCount() > 0)
        {
            throw new ServiceException("优惠券已下发，不能再修改金额、有效期或库存");
        }
        validateMerchantBody(body);
        validateCommon(body, MERCHANT_SPECIFIC);
        ShopCoupon coupon = fromBody(body, MERCHANT_SPECIFIC);
        coupon.setCouponId(couponId);
        coupon.setScopeType(MERCHANT_SPECIFIC);
        coupon.setPointsCost(null);
        coupon.setUpdateBy(operator);
        if (couponMapper.updateCoupon(coupon) == 0)
        {
            throw new ServiceException("优惠券状态已变化，请刷新后重试");
        }
        couponMapper.deleteMerchantScopes(couponId);
        couponMapper.insertMerchantScopes(couponId, List.of(merchantId));
        return merchantDetail(couponId);
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
    public ShopCoupon merchantUpdateStatus(long couponId, String status, String operator)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        requireCoupon(couponMapper.selectMerchantOwnedByIdForUpdate(merchantId, couponId));
        if (!ENABLED.equals(status) && !DISABLED.equals(status))
        {
            throw new ServiceException("优惠券状态无效");
        }
        if (couponMapper.updateStatus(couponId, status, operator) == 0)
        {
            throw new ServiceException("优惠券不存在");
        }
        return merchantDetail(couponId);
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
        if (!PLATFORM_WIDE.equals(coupon.getScopeType())
                && couponMapper.countEnabledMerchantScopes(couponId) == 0)
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
        if (couponMapper.insertGrant(grant) == 0 || grant.getGrantId() == null)
        {
            throw new ServiceException("优惠券下发记录保存失败");
        }

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

    @Transactional
    public ShopCouponGrant merchantGrant(long couponId, ShopCouponGrantBody body, String operator)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        requireCoupon(couponMapper.selectMerchantOwnedByIdForUpdate(merchantId, couponId));
        return grant(couponId, body, operator);
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

    public ShopUserCoupon myCoupon(long userCouponId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopUserCoupon coupon = requireUserCoupon(couponMapper.selectUserCoupon(userId, userCouponId));
        attachUserCouponScopes(List.of(coupon));
        return coupon;
    }

    public ShopUserCoupon previewMerchantRedemption(String redeemCode)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        ShopUserCoupon coupon = requireUserCoupon(couponMapper.selectUserCouponByCodeForMerchant(
                merchantId, normalizeRedeemCode(redeemCode)));
        validateOfflineRedemption(coupon);
        attachUserCouponScopes(List.of(coupon));
        return coupon;
    }

    @Transactional
    public ShopCouponRedemption redeemAtMerchant(ShopCouponRedeemBody body, String operator)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        ShopUserCoupon coupon = requireUserCoupon(couponMapper.selectUserCouponByCodeForMerchantForUpdate(
                merchantId, normalizeRedeemCode(body.getRedeemCode())));
        validateOfflineRedemption(coupon);

        BigDecimal consumptionAmount = body.getConsumptionAmount();
        if (coupon.getMinimumSpend().signum() > 0)
        {
            if (consumptionAmount == null)
            {
                throw new ServiceException("请输入本次消费金额");
            }
            if (consumptionAmount.compareTo(coupon.getMinimumSpend()) < 0)
            {
                throw new ServiceException("本次消费金额未达到优惠券使用门槛");
            }
        }
        BigDecimal actualAmount = consumptionAmount == null ? null
                : consumptionAmount.subtract(coupon.getDiscountAmount()).max(BigDecimal.ZERO);

        ShopCouponRedemption redemption = new ShopCouponRedemption();
        redemption.setUserCouponId(coupon.getUserCouponId());
        redemption.setCouponId(coupon.getCouponId());
        redemption.setShopUserId(coupon.getShopUserId());
        redemption.setMerchantId(merchantId);
        redemption.setCouponName(coupon.getCouponName());
        redemption.setMinimumSpend(coupon.getMinimumSpend());
        redemption.setDiscountAmount(coupon.getDiscountAmount());
        redemption.setConsumptionAmount(consumptionAmount);
        redemption.setActualAmount(actualAmount);
        redemption.setOperatorId(SecurityUtils.getUserId());
        redemption.setOperatorName(operator);
        if (couponMapper.insertRedemption(redemption) == 0
                || couponMapper.markUserCouponRedeemed(coupon.getUserCouponId()) == 0)
        {
            throw new ServiceException("优惠券状态已变化，请重新扫码");
        }
        return redemption;
    }

    public List<ShopCouponRedemption> merchantRedemptions(long merchantId)
    {
        return couponMapper.selectMerchantRedemptions(merchantId);
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

    public List<ShopCouponExchangeOption> exchangeableCoupons()
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        return couponMapper.selectExchangeableCoupons(userId);
    }

    @Transactional
    public void exchangeWithPoints(long couponId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopCoupon coupon = requireCoupon(couponMapper.selectByIdForUpdate(couponId));
        Date now = new Date();
        if (!PLATFORM_WIDE.equals(coupon.getScopeType()))
        {
            throw new ServiceException("该优惠券不是全平台积分兑换券");
        }
        if (coupon.getPointsCost() == null || coupon.getPointsCost() <= 0)
        {
            throw new ServiceException("该优惠券暂不支持积分兑换");
        }
        if (!ENABLED.equals(coupon.getStatus()))
        {
            throw new ServiceException("优惠券已下架，暂不可兑换");
        }
        if (coupon.getStartTime() == null || coupon.getStartTime().after(now))
        {
            throw new ServiceException("优惠券兑换尚未开始");
        }
        if (coupon.getEndTime() == null || !coupon.getEndTime().after(now))
        {
            throw new ServiceException("优惠券已过期，不能兑换");
        }
        if (couponMapper.countCouponExchange(couponId, userId) > 0)
        {
            throw new ServiceException("每位用户只能兑换一次该优惠券");
        }
        if (couponMapper.reserveStock(couponId, 1, "points_exchange") == 0)
        {
            throw new ServiceException("优惠券库存不足或状态已变化，请刷新后重试");
        }

        pointService.consumeForCoupon(userId, coupon.getPointsCost(), couponId, coupon.getCouponName());

        ShopCouponGrant grant = new ShopCouponGrant();
        grant.setCouponId(couponId);
        grant.setUserCount(1);
        grant.setQuantityPerUser(1);
        grant.setTotalQuantity(1);
        grant.setGrantType("POINTS_EXCHANGE");
        grant.setTriggerCode("COUPON_EXCHANGE:" + couponId + ":" + userId);
        grant.setOperatorId(null);
        grant.setOperatorName("用户积分兑换");
        if (couponMapper.insertGrant(grant) == 0 || grant.getGrantId() == null)
        {
            throw new ServiceException("优惠券兑换下发记录保存失败");
        }

        ShopUserCoupon userCoupon = new ShopUserCoupon();
        userCoupon.setCouponId(couponId);
        userCoupon.setShopUserId(userId);
        userCoupon.setGrantId(grant.getGrantId());
        userCoupon.setCouponCode("CP" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
        userCoupon.setStatus(UNUSED);
        if (couponMapper.insertUserCoupons(List.of(userCoupon)) != 1)
        {
            throw new ServiceException("兑换优惠券发放失败");
        }

        if (couponMapper.insertCouponExchange(couponId, userId, coupon.getPointsCost()) == 0)
        {
            throw new ServiceException("优惠券兑换记录保存失败");
        }
    }

    List<ShopUserCoupon> lockUsableCoupons(long userId, List<Long> userCouponIds,
            long merchantId, BigDecimal subtotal)
    {
        if (userCouponIds == null || userCouponIds.isEmpty())
        {
            return List.of();
        }
        if (userCouponIds.size() > 50)
        {
            throw new ServiceException("一笔订单最多使用50张优惠券");
        }
        LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>();
        for (Long userCouponId : userCouponIds)
        {
            if (userCouponId == null || userCouponId <= 0)
            {
                throw new ServiceException("优惠券参数无效");
            }
            if (!uniqueIds.add(userCouponId))
            {
                throw new ServiceException("不能重复选择同一张优惠券");
            }
        }
        List<Long> lockOrder = uniqueIds.stream().sorted().toList();
        Map<Long, ShopUserCoupon> lockedById = new java.util.HashMap<>();
        for (Long userCouponId : lockOrder)
        {
            lockedById.put(userCouponId,
                    lockUsableCoupon(userId, userCouponId, merchantId, subtotal));
        }
        return uniqueIds.stream().map(lockedById::get).toList();
    }

    private ShopUserCoupon lockUsableCoupon(long userId, long userCouponId,
            long merchantId, BigDecimal subtotal)
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
        if (!USAGE_ORDER.equals(coupon.getUsageMode()) && !USAGE_BOTH.equals(coupon.getUsageMode()))
        {
            throw new ServiceException("该优惠券仅支持到店核销，不能用于商城订单");
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
        if (!PLATFORM_WIDE.equals(coupon.getScopeType())
                && couponMapper.countCouponMerchant(coupon.getCouponId(), merchantId) == 0)
        {
            throw new ServiceException("优惠券不适用于当前商家");
        }
        if (subtotal.compareTo(coupon.getMinimumSpend()) < 0)
        {
            throw new ServiceException("订单金额未达到优惠券使用门槛");
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

    private List<Long> normalizeAdminMerchantIds(ShopCouponBody body)
    {
        List<Long> merchantIds = body.getMerchantIds() == null ? new ArrayList<>()
                : new ArrayList<>(new LinkedHashSet<>(body.getMerchantIds()));
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

    private String normalizeAdminScopeType(ShopCouponBody body)
    {
        String scopeType = StringUtils.isEmpty(StringUtils.trim(body.getScopeType()))
                ? MERCHANT_SPECIFIC : StringUtils.trim(body.getScopeType());
        if (!MERCHANT_SPECIFIC.equals(scopeType) && !PLATFORM_WIDE.equals(scopeType))
        {
            throw new ServiceException("优惠券适用范围无效");
        }
        if (PLATFORM_WIDE.equals(scopeType))
        {
            if (body.getPointsCost() == null || body.getPointsCost() <= 0)
            {
                throw new ServiceException("全平台通用券必须设置积分兑换价格");
            }
            if (body.getMerchantIds() != null && !body.getMerchantIds().isEmpty())
            {
                throw new ServiceException("全平台通用券不能指定适用商家");
            }
            if (!USAGE_ORDER.equals(body.getUsageMode()))
            {
                throw new ServiceException("全平台通用券暂时只支持商城订单使用");
            }
        }
        else if (body.getPointsCost() != null)
        {
            throw new ServiceException("指定商家券不能设置积分兑换价格");
        }
        validateCommon(body, scopeType);
        return scopeType;
    }

    private void validateCommon(ShopCouponBody body, String scopeType)
    {
        String usageMode = StringUtils.trim(body.getUsageMode());
        if (!USAGE_ORDER.equals(usageMode) && !USAGE_OFFLINE.equals(usageMode)
                && !USAGE_BOTH.equals(usageMode))
        {
            throw new ServiceException("优惠券使用方式无效");
        }
        LocalDate startDate = couponDate(body.getStartTime());
        LocalDate endDate = couponDate(body.getEndTime());
        if (endDate.isBefore(startDate))
        {
            throw new ServiceException("结束日期不能早于开始日期");
        }
        if (MERCHANT_SPECIFIC.equals(scopeType) && body.getMinimumSpend() == null)
        {
            throw new ServiceException("请输入最低消费金额");
        }
        if (MERCHANT_SPECIFIC.equals(scopeType) && body.getMinimumSpend().signum() > 0
                && body.getDiscountAmount().compareTo(body.getMinimumSpend()) > 0)
        {
            throw new ServiceException("优惠金额不能大于最低消费金额");
        }
    }

    private void validateMerchantBody(ShopCouponBody body)
    {
        if (PLATFORM_WIDE.equals(StringUtils.trim(body.getScopeType())) || body.getPointsCost() != null)
        {
            throw new ServiceException("商家不能创建或修改全平台通用券");
        }
    }

    private ShopCoupon fromBody(ShopCouponBody body, String scopeType)
    {
        ShopCoupon coupon = new ShopCoupon();
        coupon.setCouponName(StringUtils.trim(body.getCouponName()));
        coupon.setDescription(StringUtils.trim(body.getDescription()));
        coupon.setUsageMode(StringUtils.trim(body.getUsageMode()));
        coupon.setRedeemInstructions(StringUtils.trim(body.getRedeemInstructions()));
        coupon.setDiscountAmount(body.getDiscountAmount());
        coupon.setMinimumSpend(PLATFORM_WIDE.equals(scopeType) ? BigDecimal.ZERO : body.getMinimumSpend());
        coupon.setScopeType(scopeType);
        coupon.setPointsCost(null);
        coupon.setStartTime(atCouponTime(body.getStartTime(), LocalTime.MIDNIGHT));
        coupon.setEndTime(atCouponTime(body.getEndTime(), LocalTime.of(23, 59, 59)));
        coupon.setStatus(body.getStatus());
        coupon.setTotalStock(body.getTotalStock());
        return coupon;
    }

    private LocalDate couponDate(Date value)
    {
        return value.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
    }

    private Date atCouponTime(Date value, LocalTime time)
    {
        return Date.from(couponDate(value).atTime(time).atZone(ZoneId.systemDefault()).toInstant());
    }

    private ShopCoupon requireCoupon(ShopCoupon coupon)
    {
        if (coupon == null)
        {
            throw new ServiceException("优惠券不存在");
        }
        return coupon;
    }

    private ShopUserCoupon requireUserCoupon(ShopUserCoupon coupon)
    {
        if (coupon == null)
        {
            throw new ServiceException("优惠券不存在或核销码无效");
        }
        return coupon;
    }

    private String normalizeRedeemCode(String redeemCode)
    {
        String normalized = StringUtils.trim(redeemCode).toUpperCase();
        if (!normalized.matches("^CP[0-9A-F]{32}$"))
        {
            throw new ServiceException("优惠券核销码无效");
        }
        return normalized;
    }

    private void validateOfflineRedemption(ShopUserCoupon coupon)
    {
        if (!USAGE_OFFLINE.equals(coupon.getUsageMode()) && !USAGE_BOTH.equals(coupon.getUsageMode()))
        {
            throw new ServiceException("该优惠券不支持到店核销");
        }
        if (!UNUSED.equals(coupon.getStatus()))
        {
            throw new ServiceException("优惠券已使用，不能重复核销");
        }
        Date now = new Date();
        if (!ENABLED.equals(coupon.getCouponStatus()))
        {
            throw new ServiceException("优惠券已下架，不能核销");
        }
        if (coupon.getStartTime() == null || coupon.getStartTime().after(now))
        {
            throw new ServiceException("优惠券尚未生效");
        }
        if (coupon.getEndTime() == null || !coupon.getEndTime().after(now))
        {
            throw new ServiceException("优惠券已过期");
        }
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
