package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderAddress;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopOrderLogisticsEvent;
import com.ruoyi.shop.domain.ShopOrderRefund;
import com.ruoyi.shop.domain.ShopOrderStatusLog;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopUserAddress;

public interface ShopOrderMapper
{
    ShopUserAddress selectUserAddress(@Param("userId") Long userId, @Param("addressId") Long addressId);
    ShopProduct selectOrderableProductForUpdate(Long productId);
    int countPublishedReportForProduct(@Param("reportId") Long reportId, @Param("productId") Long productId);
    int deductStock(@Param("productId") Long productId, @Param("quantity") Integer quantity);
    int restoreStock(@Param("productId") Long productId, @Param("quantity") Integer quantity);
    int insertOrder(ShopOrder order);
    int insertOrderItem(ShopOrderItem item);
    int insertOrderAddress(ShopOrderAddress address);
    int insertStatusLog(ShopOrderStatusLog log);
    int insertLogisticsEvent(ShopOrderLogisticsEvent event);
    int insertRefund(ShopOrderRefund refund);
    ShopOrderRefund selectLatestRefund(Long orderId);
    int updateRefundAudit(@Param("refundId") Long refundId, @Param("merchantId") Long merchantId,
            @Param("fromStatus") String fromStatus, @Param("toStatus") String toStatus,
            @Param("auditBy") Long auditBy, @Param("auditRemark") String auditRemark);
    List<ShopOrder> selectUserOrders(Long userId);
    ShopOrder selectUserOrder(@Param("userId") Long userId, @Param("orderId") Long orderId);
    ShopOrder selectUserOrderForUpdate(@Param("userId") Long userId, @Param("orderId") Long orderId);
    List<ShopOrderItem> selectOrderItems(Long orderId);
    ShopOrderItem selectUserReceivedOrderItemForUpdate(@Param("userId") Long userId,
            @Param("orderItemId") Long orderItemId);
    ShopOrderAddress selectOrderAddress(Long orderId);
    List<ShopOrderStatusLog> selectStatusLogs(Long orderId);
    List<ShopOrderLogisticsEvent> selectLogisticsEvents(Long orderId);
    int updateStatus(@Param("userId") Long userId, @Param("orderId") Long orderId,
            @Param("fromStatus") String fromStatus, @Param("toStatus") String toStatus);
    List<ShopOrder> selectMerchantOrders(Long merchantId);
    ShopOrder selectMerchantOrder(@Param("merchantId") Long merchantId, @Param("orderId") Long orderId);
    ShopOrder selectMerchantOrderForUpdate(@Param("merchantId") Long merchantId, @Param("orderId") Long orderId);
    List<ShopOrder> selectAdminOrders();
    ShopOrder selectAdminOrder(Long orderId);
    int shipOrder(@Param("merchantId") Long merchantId, @Param("orderId") Long orderId,
            @Param("carrier") String carrier, @Param("trackingNo") String trackingNo);
}
