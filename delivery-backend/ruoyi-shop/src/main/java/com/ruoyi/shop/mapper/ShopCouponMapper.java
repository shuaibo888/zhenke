package com.ruoyi.shop.mapper;

import java.math.BigDecimal;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopCoupon;
import com.ruoyi.shop.domain.ShopCouponGrant;
import com.ruoyi.shop.domain.ShopCouponMerchant;
import com.ruoyi.shop.domain.ShopUserCoupon;

public interface ShopCouponMapper
{
    List<ShopCoupon> selectAdminList(ShopCoupon query);
    ShopCoupon selectById(Long couponId);
    ShopCoupon selectByIdForUpdate(Long couponId);
    List<ShopCouponMerchant> selectMerchantScopes(@Param("couponIds") List<Long> couponIds);
    int countEnabledMerchants(@Param("merchantIds") List<Long> merchantIds);
    int countEnabledUsers(@Param("userIds") List<Long> userIds);
    int countEnabledMerchantScopes(Long couponId);
    int insertCoupon(ShopCoupon coupon);
    int updateCoupon(ShopCoupon coupon);
    int updateStatus(@Param("couponId") Long couponId, @Param("status") String status,
            @Param("updateBy") String updateBy);
    int reserveStock(@Param("couponId") Long couponId, @Param("quantity") int quantity,
            @Param("updateBy") String updateBy);
    int deleteMerchantScopes(Long couponId);
    int insertMerchantScopes(@Param("couponId") Long couponId, @Param("merchantIds") List<Long> merchantIds);
    int insertGrant(ShopCouponGrant grant);
    int insertUserCoupons(@Param("coupons") List<ShopUserCoupon> coupons);
    List<ShopCouponGrant> selectGrants(Long couponId);
    List<ShopUserCoupon> selectUserCoupons(Long userId);
    List<ShopUserCoupon> selectAvailableUserCoupons(@Param("userId") Long userId,
            @Param("merchantId") Long merchantId, @Param("subtotal") BigDecimal subtotal);
    ShopUserCoupon selectUserCouponForUpdate(@Param("userId") Long userId,
            @Param("userCouponId") Long userCouponId);
    int countCouponMerchant(@Param("couponId") Long couponId, @Param("merchantId") Long merchantId);
    int markUserCouponUsed(@Param("userId") Long userId, @Param("userCouponId") Long userCouponId,
            @Param("orderId") Long orderId);
    int releaseUserCouponByOrder(Long orderId);
}
