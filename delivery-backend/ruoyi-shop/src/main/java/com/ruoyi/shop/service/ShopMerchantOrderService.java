package com.ruoyi.shop.service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderCoupon;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopOrderLogisticsEvent;
import com.ruoyi.shop.domain.ShopOrderRefund;
import com.ruoyi.shop.domain.ShopOrderStatusLog;
import com.ruoyi.shop.domain.dto.ShopOrderShipBody;
import com.ruoyi.shop.domain.dto.ShopOrderRefundAuditBody;
import com.ruoyi.shop.domain.vo.ShopLogisticsTrace;
import com.ruoyi.shop.logistics.AliyunLogisticsService;
import com.ruoyi.shop.mapper.ShopOrderMapper;

@Service
public class ShopMerchantOrderService
{
    private final ShopOrderMapper orderMapper;
    private final ShopMerchantService merchantService;
    private final AliyunLogisticsService logisticsService;

    public ShopMerchantOrderService(ShopOrderMapper orderMapper, ShopMerchantService merchantService,
            AliyunLogisticsService logisticsService)
    {
        this.orderMapper = orderMapper;
        this.merchantService = merchantService;
        this.logisticsService = logisticsService;
    }

    public List<ShopOrder> merchantOrders(long merchantId, String status, String keyword)
    {
        return hydrateList(orderMapper.selectMerchantOrders(merchantId, status, keyword));
    }

    public ShopOrder merchantOrder(long orderId)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        return hydrate(requireMerchantOrder(merchantId, orderId, false));
    }

    public ShopLogisticsTrace merchantOrderLogistics(long orderId)
    {
        long merchantId = merchantService.currentMerchantAccount().getMerchantId();
        ShopOrder order = requireMerchantOrder(merchantId, orderId, false);
        return logisticsService.query(order.getCarrier(), order.getTrackingNo(), List.of());
    }

    public ShopLogisticsTrace adminOrderLogistics(long orderId)
    {
        ShopOrder adminOrder = requireAdminOrder(orderId);
        ShopOrder order = requireMerchantOrder(adminOrder.getMerchantId(), orderId, false);
        return logisticsService.query(order.getCarrier(), order.getTrackingNo(), List.of());
    }

    @Transactional
    public ShopOrder ship(long orderId, ShopOrderShipBody body)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return shipForMerchant(merchant.getMerchantId(), orderId, body,
                "MERCHANT", merchant.getMerchantId(), "商家发货");
    }

    @Transactional
    public ShopOrder adminShip(long orderId, ShopOrderShipBody body)
    {
        ShopOrder adminOrder = requireAdminOrder(orderId);
        return shipForMerchant(adminOrder.getMerchantId(), orderId, body,
                "ADMIN", SecurityUtils.getUserId(), "平台管理员发货");
    }

    private ShopOrder shipForMerchant(long merchantId, long orderId, ShopOrderShipBody body,
            String operatorType, long operatorId, String remark)
    {
        ShopOrder order = requireMerchantOrder(merchantId, orderId, true);
        if (ShopProductService.FULFILLMENT_OFFLINE.equals(order.getFulfillmentType()))
        {
            throw new ServiceException("线下核销订单无需发货");
        }
        if (!ShopOrderService.PAID.equals(order.getStatus()))
        {
            throw new ServiceException(ShopOrderService.SHIPPED.equals(order.getStatus())
                    ? "订单已发货，请勿重复操作" : "只有已支付订单可以发货");
        }
        String trackingNo = StringUtils.trim(body.getTrackingNo());
        if (StringUtils.isEmpty(trackingNo))
        {
            throw new ServiceException("物流单号不能为空");
        }
        if (trackingNo.length() > 100)
        {
            throw new ServiceException("物流单号长度超出限制");
        }
        if (orderMapper.shipOrder(merchantId, orderId, trackingNo) == 0)
        {
            throw new ServiceException("订单状态已变化，请刷新后重试");
        }
        insertStatusLog(orderId, ShopOrderService.PAID, ShopOrderService.SHIPPED,
                operatorType, operatorId, remark);
        insertLogisticsEvent(orderId, operatorType);
        return hydrate(requireMerchantOrder(merchantId, orderId, false));
    }

    @Transactional
    public ShopOrder redeem(String redeemCode)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return redeemForMerchant(merchant.getMerchantId(), redeemCode);
    }

    @Transactional
    public ShopOrder adminRedeem(String redeemCode)
    {
        String normalized = StringUtils.trim(redeemCode);
        ShopOrder order = orderMapper.selectAdminOrderByRedeemCode(normalized);
        if (order == null)
        {
            throw new ServiceException("核销码无效");
        }
        return redeemForMerchant(order.getMerchantId(), normalized);
    }

    private ShopOrder redeemForMerchant(long merchantId, String redeemCode)
    {
        String normalized = StringUtils.trim(redeemCode);
        if (StringUtils.isEmpty(normalized))
        {
            throw new ServiceException("核销码不能为空");
        }
        if (orderMapper.redeemOrder(merchantId, normalized) == 0)
        {
            throw new ServiceException("核销码无效或不属于当前商家");
        }
        ShopOrder order = orderMapper.selectMerchantOrderByRedeemCode(merchantId, normalized);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        return hydrate(order);
    }

    @Transactional
    public ShopOrder auditRefund(long orderId, ShopOrderRefundAuditBody body)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        return auditRefundForMerchant(merchant.getMerchantId(), orderId, body,
                merchant.getAdminUserId(), "MERCHANT", merchant.getMerchantId(),
                "商家审核通过退款申请，等待支付渠道退款结果");
    }

    @Transactional
    public ShopOrder adminAuditRefund(long orderId, ShopOrderRefundAuditBody body)
    {
        ShopOrder adminOrder = requireAdminOrder(orderId);
        Long adminUserId = SecurityUtils.getUserId();
        return auditRefundForMerchant(adminOrder.getMerchantId(), orderId, body,
                adminUserId, "ADMIN", adminUserId,
                "平台管理员审核通过退款申请，等待支付渠道退款结果");
    }

    private ShopOrder auditRefundForMerchant(long merchantId, long orderId,
            ShopOrderRefundAuditBody body, Long auditBy, String operatorType,
            long operatorId, String approvedRemark)
    {
        ShopOrder order = requireMerchantOrder(merchantId, orderId, true);
        ShopOrderRefund refund = orderMapper.selectLatestRefund(orderId);
        if (refund == null || !ShopOrderService.REFUND_PENDING.equals(refund.getRefundStatus())
                || !"1".equals(refund.getReviewRequired()))
        {
            throw new ServiceException("当前订单没有待审核的退款申请");
        }
        if (!ShopOrderService.RECEIVED.equals(order.getStatus()))
        {
            throw new ServiceException("只有已收货订单的退款申请可以审核");
        }
        if (!"WECHAT".equals(order.getPaymentChannel()))
        {
            throw new ServiceException("该订单不是微信支付订单，无法发起微信原路退款");
        }
        String decision = StringUtils.trim(body.getDecision());
        String auditRemark = StringUtils.trim(body.getAuditRemark());
        if (!ShopOrderService.REFUND_AUDIT_APPROVED.equals(decision)
                && !ShopOrderService.REFUND_REJECTED.equals(decision))
        {
            throw new ServiceException("退款审核结果无效");
        }
        if (ShopOrderService.REFUND_REJECTED.equals(decision) && StringUtils.isEmpty(auditRemark))
        {
            throw new ServiceException("驳回退款时必须填写审核说明");
        }
        String refundStatus = ShopOrderService.REFUND_AUDIT_APPROVED.equals(decision)
                ? ShopOrderService.REFUND_STATUS_REFUNDING : ShopOrderService.REFUND_REJECTED;
        if (orderMapper.updateRefundAudit(refund.getRefundId(), merchantId,
                ShopOrderService.REFUND_PENDING, refundStatus, auditBy, auditRemark) == 0)
        {
            throw new ServiceException("退款申请状态已变化，请刷新后重试");
        }
        if (ShopOrderService.REFUND_AUDIT_APPROVED.equals(decision))
        {
            if (orderMapper.updateStatus(order.getUserId(), orderId,
                    ShopOrderService.RECEIVED, ShopOrderService.REFUNDING) == 0)
            {
                throw new ServiceException("订单状态已变化，请刷新后重试");
            }
            insertStatusLog(orderId, ShopOrderService.RECEIVED, ShopOrderService.REFUNDING,
                    operatorType, operatorId, approvedRemark);
        }
        return hydrate(requireMerchantOrder(merchantId, orderId, false));
    }

    private ShopOrder requireMerchantOrder(long merchantId, long orderId, boolean forUpdate)
    {
        ShopOrder order = forUpdate
                ? orderMapper.selectMerchantOrderForUpdate(merchantId, orderId)
                : orderMapper.selectMerchantOrder(merchantId, orderId);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        return order;
    }

    private ShopOrder hydrate(ShopOrder order)
    {
        order.setItems(orderMapper.selectOrderItems(order.getOrderId()));
        order.setCoupons(orderMapper.selectOrderCoupons(order.getOrderId()));
        order.setAddress(orderMapper.selectOrderAddress(order.getOrderId()));
        order.setStatusLogs(orderMapper.selectStatusLogs(order.getOrderId()));
        order.setLogisticsEvents(orderMapper.selectLogisticsEvents(order.getOrderId()));
        return order;
    }

    private ShopOrder requireAdminOrder(long orderId)
    {
        ShopOrder order = orderMapper.selectAdminOrder(orderId);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        return order;
    }

    private List<ShopOrder> hydrateList(List<ShopOrder> orders)
    {
        if (orders == null || orders.isEmpty())
        {
            return orders;
        }
        List<Long> orderIds = orders.stream().map(ShopOrder::getOrderId).toList();
        Map<Long, List<ShopOrderItem>> itemsByOrder = orderMapper.selectOrderItemsByOrderIds(orderIds)
                .stream().collect(Collectors.groupingBy(ShopOrderItem::getOrderId));
        Map<Long, List<ShopOrderCoupon>> couponsByOrder = orderMapper.selectOrderCouponsByOrderIds(orderIds)
                .stream().collect(Collectors.groupingBy(ShopOrderCoupon::getOrderId));
        orders.forEach(order -> order.setItems(
                itemsByOrder.getOrDefault(order.getOrderId(), Collections.emptyList())));
        orders.forEach(order -> order.setCoupons(
                couponsByOrder.getOrDefault(order.getOrderId(), Collections.emptyList())));
        return orders;
    }

    private void insertLogisticsEvent(long orderId, String operatorType)
    {
        boolean adminOperation = "ADMIN".equals(operatorType);
        ShopOrderLogisticsEvent event = new ShopOrderLogisticsEvent();
        event.setOrderId(orderId);
        event.setEventCode(adminOperation ? "ADMIN_SHIPPED" : "MERCHANT_SHIPPED");
        event.setDescription(adminOperation ? "平台管理员已发货，等待承运商揽收" : "商家已发货，等待承运商揽收");
        event.setSource("SYSTEM");
        event.setSourceEventId(adminOperation ? "ADMIN_SHIPPED" : "MERCHANT_SHIPPED");
        if (orderMapper.insertLogisticsEvent(event) == 0)
        {
            throw new ServiceException("订单物流事件创建失败");
        }
    }

    private void insertStatusLog(long orderId, String fromStatus, String toStatus,
            String operatorType, long operatorId, String remark)
    {
        ShopOrderStatusLog log = new ShopOrderStatusLog();
        log.setOrderId(orderId);
        log.setFromStatus(fromStatus);
        log.setToStatus(toStatus);
        log.setOperatorType(operatorType);
        log.setOperatorId(operatorId);
        log.setRemark(remark);
        if (orderMapper.insertStatusLog(log) == 0)
        {
            throw new ServiceException("订单状态日志创建失败");
        }
    }
}
