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
}
