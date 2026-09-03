package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopCoupon;
import com.ruoyi.shop.domain.ShopUserCoupon;
import com.ruoyi.shop.domain.dto.ShopCouponBody;
import com.ruoyi.shop.mapper.ShopCouponMapper;

class ShopCouponServiceTest
{
    private final ShopCouponMapper couponMapper = mock(ShopCouponMapper.class);
    private final ShopMerchantService merchantService = mock(ShopMerchantService.class);
    private final ShopPointService pointService = mock(ShopPointService.class);
    private final ShopCouponService couponService = new ShopCouponService(couponMapper, merchantService, pointService);

    @Test
    void rejectsEndDateBeforeStartDate()
    {
        ShopCouponBody body = validBody();
        body.setEndTime(Date.from(Instant.parse("2026-07-31T00:00:00Z")));

        assertThrows(ServiceException.class, () -> couponService.create(body, "admin"));
    }

    @Test
    void rejectsDiscountGreaterThanMinimumSpend()
    {
        ShopCouponBody body = validBody();
        body.setDiscountAmount(new BigDecimal("21.00"));
        body.setMinimumSpend(new BigDecimal("20.00"));

        assertThrows(ServiceException.class, () -> couponService.create(body, "admin"));
    }

    @Test
    void platformCouponRequiresPositivePointsCost()
    {
        ShopCouponBody body = validBody();
        body.setScopeType(ShopCouponService.PLATFORM_WIDE);
        body.setMerchantIds(List.of());
        body.setPointsCost(null);

        assertThrows(ServiceException.class, () -> couponService.create(body, "admin"));
    }

    @Test
    void platformCouponCannotSpecifyMerchantScope()
    {
        ShopCouponBody body = validBody();
        body.setScopeType(ShopCouponService.PLATFORM_WIDE);
        body.setPointsCost(500L);

        assertThrows(ServiceException.class, () -> couponService.create(body, "admin"));
    }

    @Test
    void platformCouponAlwaysUsesZeroMinimumSpend()
    {
        ShopCouponBody body = validBody();
        body.setScopeType(ShopCouponService.PLATFORM_WIDE);
        body.setMerchantIds(List.of());
        body.setPointsCost(500L);
        body.setMinimumSpend(new BigDecimal("999.00"));
        AtomicReference<ShopCoupon> inserted = new AtomicReference<>();
        when(couponMapper.insertCoupon(any(ShopCoupon.class))).thenAnswer(invocation -> {
            ShopCoupon coupon = invocation.getArgument(0);
            coupon.setCouponId(9L);
            inserted.set(coupon);
            return 1;
        });
        when(couponMapper.selectById(9L)).thenAnswer(ignored -> inserted.get());

        ShopCoupon created = couponService.create(body, "admin");

        assertEquals(0, BigDecimal.ZERO.compareTo(created.getMinimumSpend()));
    }

    @Test
    void merchantCouponTargetsHighestAmountEligibleChildOrder()
    {
        ShopUserCoupon coupon = usableUserCoupon(31L, 41L, ShopCouponService.MERCHANT_SPECIFIC,
                new BigDecimal("100.00"));
        when(couponMapper.selectUserCouponForUpdate(9L, 31L)).thenReturn(coupon);
        when(couponMapper.countCouponMerchant(41L, 1L)).thenReturn(1);
        when(couponMapper.countCouponMerchant(41L, 2L)).thenReturn(0);

        var allocated = couponService.lockAndAllocateCoupons(9L, List.of(31L), List.of(
                new ShopCouponService.OrderCouponCandidate(0, 1L, new BigDecimal("120.00")),
                new ShopCouponService.OrderCouponCandidate(1, 1L, new BigDecimal("380.00")),
                new ShopCouponService.OrderCouponCandidate(2, 2L, new BigDecimal("900.00"))));

        assertEquals(List.of(coupon), allocated.get(1));
        assertEquals(1, allocated.size());
    }

    @Test
    void platformCouponTargetsHighestAmountChildOrderAcrossMerchants()
    {
        ShopUserCoupon coupon = usableUserCoupon(32L, 42L, ShopCouponService.PLATFORM_WIDE,
                BigDecimal.ZERO);
        when(couponMapper.selectUserCouponForUpdate(9L, 32L)).thenReturn(coupon);

        var allocated = couponService.lockAndAllocateCoupons(9L, List.of(32L), List.of(
                new ShopCouponService.OrderCouponCandidate(0, 1L, new BigDecimal("500.00")),
                new ShopCouponService.OrderCouponCandidate(1, 2L, new BigDecimal("800.00"))));

        assertEquals(List.of(coupon), allocated.get(1));
    }

    @Test
    void couponIsRejectedWhenNoEligibleChildOrderMeetsThreshold()
    {
        ShopUserCoupon coupon = usableUserCoupon(33L, 43L, ShopCouponService.MERCHANT_SPECIFIC,
                new BigDecimal("500.00"));
        when(couponMapper.selectUserCouponForUpdate(9L, 33L)).thenReturn(coupon);
        when(couponMapper.countCouponMerchant(43L, 1L)).thenReturn(1);

        ServiceException error = assertThrows(ServiceException.class,
                () -> couponService.lockAndAllocateCoupons(9L, List.of(33L), List.of(
                        new ShopCouponService.OrderCouponCandidate(
                                0, 1L, new BigDecimal("499.99")))));

        assertEquals("没有子订单达到优惠券使用门槛", error.getMessage());
    }

    @Test
    void validManualTargetOverridesHighestAmountRecommendation()
    {
        ShopUserCoupon coupon = usableUserCoupon(34L, 44L, ShopCouponService.PLATFORM_WIDE,
                BigDecimal.ZERO);
        when(couponMapper.selectUserCouponForUpdate(9L, 34L)).thenReturn(coupon);

        var allocated = couponService.lockAndAllocateCoupons(9L, List.of(34L), List.of(
                new ShopCouponService.OrderCouponCandidate(0, 1L, new BigDecimal("200.00")),
                new ShopCouponService.OrderCouponCandidate(1, 2L, new BigDecimal("900.00"))),
                java.util.Map.of(34L, 0));

        assertEquals(List.of(coupon), allocated.get(0));
        assertEquals(1, allocated.size());
    }

    @Test
    void manualTargetCannotBypassMerchantOrThresholdValidation()
    {
        ShopUserCoupon coupon = usableUserCoupon(35L, 45L, ShopCouponService.MERCHANT_SPECIFIC,
                new BigDecimal("100.00"));
        when(couponMapper.selectUserCouponForUpdate(9L, 35L)).thenReturn(coupon);
        when(couponMapper.countCouponMerchant(45L, 1L)).thenReturn(1);
        when(couponMapper.countCouponMerchant(45L, 2L)).thenReturn(0);

        ServiceException error = assertThrows(ServiceException.class,
                () -> couponService.lockAndAllocateCoupons(9L, List.of(35L), List.of(
                        new ShopCouponService.OrderCouponCandidate(0, 1L, new BigDecimal("200.00")),
                        new ShopCouponService.OrderCouponCandidate(1, 2L, new BigDecimal("900.00"))),
                        java.util.Map.of(35L, 1)));

        assertEquals("优惠券不能用于指定的目标订单", error.getMessage());
    }

    private ShopCouponBody validBody()
    {
        ShopCouponBody body = new ShopCouponBody();
        body.setCouponName("定向优惠券");
        body.setDescription("仅适用于管理员指定商家");
        body.setUsageMode(ShopCouponService.USAGE_ORDER);
        body.setDiscountAmount(new BigDecimal("20.00"));
        body.setMinimumSpend(new BigDecimal("100.00"));
        body.setStartTime(Date.from(Instant.parse("2026-08-01T00:00:00Z")));
        body.setEndTime(Date.from(Instant.parse("2026-09-01T00:00:00Z")));
        body.setStatus(ShopCouponService.ENABLED);
        body.setTotalStock(100);
        body.setMerchantIds(List.of(1L));
        body.setScopeType(ShopCouponService.MERCHANT_SPECIFIC);
        return body;
    }

    private ShopUserCoupon usableUserCoupon(long userCouponId, long couponId,
            String scopeType, BigDecimal minimumSpend)
    {
        ShopUserCoupon coupon = new ShopUserCoupon();
        coupon.setUserCouponId(userCouponId);
        coupon.setCouponId(couponId);
        coupon.setStatus("UNUSED");
        coupon.setUsageMode(ShopCouponService.USAGE_ORDER);
        coupon.setCouponStatus(ShopCouponService.ENABLED);
        coupon.setScopeType(scopeType);
        coupon.setMinimumSpend(minimumSpend);
        coupon.setDiscountAmount(new BigDecimal("20.00"));
        coupon.setStartTime(Date.from(Instant.now().minusSeconds(3600)));
        coupon.setEndTime(Date.from(Instant.now().plusSeconds(3600)));
        return coupon;
    }
}
