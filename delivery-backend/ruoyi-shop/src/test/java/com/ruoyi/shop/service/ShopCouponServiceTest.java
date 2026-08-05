package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.dto.ShopCouponBody;
import com.ruoyi.shop.mapper.ShopCouponMapper;

class ShopCouponServiceTest
{
    private final ShopCouponMapper couponMapper = mock(ShopCouponMapper.class);
    private final ShopMerchantService merchantService = mock(ShopMerchantService.class);
    private final ShopCouponService couponService = new ShopCouponService(couponMapper, merchantService);

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

    private ShopCouponBody validBody()
    {
        ShopCouponBody body = new ShopCouponBody();
        body.setCouponName("定向优惠券");
        body.setDescription("仅适用于管理员指定商家");
        body.setDiscountAmount(new BigDecimal("20.00"));
        body.setMinimumSpend(new BigDecimal("100.00"));
        body.setStartTime(Date.from(Instant.parse("2026-08-01T00:00:00Z")));
        body.setEndTime(Date.from(Instant.parse("2026-09-01T00:00:00Z")));
        body.setStatus(ShopCouponService.ENABLED);
        body.setTotalStock(100);
        body.setMerchantIds(List.of(1L));
        return body;
    }
}
