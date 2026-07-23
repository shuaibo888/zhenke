package com.ruoyi.shop.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopOrder;
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

    public List<ShopOrder> merchantOrders(long merchantId)
    {
        return orderMapper.selectMerchantOrders(merchantId).stream().map(this::hydrate).toList();
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

    @Transactional
    public ShopOrder ship(long orderId, ShopOrderShipBody body)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        long merchantId = merchant.getMerchantId();
        ShopOrder order = requireMerchantOrder(merchantId, orderId, true);
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
        insertStatusLog(orderId, ShopOrderService.PAID, ShopOrderService.SHIPPED, merchantId, "商家发货");
        insertLogisticsEvent(orderId);
        return hydrate(requireMerchantOrder(merchantId, orderId, false));
    }

    @Transactional
    public ShopOrder auditRefund(long orderId, ShopOrderRefundAuditBody body)
    {
        ShopMerchant merchant = merchantService.currentMerchantAccount();
        long merchantId = merchant.getMerchantId();
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
        Long auditBy = merchant.getAdminUserId();
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
                    merchantId, "商家审核通过退款申请，等待支付渠道退款结果");
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
        order.setAddress(orderMapper.selectOrderAddress(order.getOrderId()));
        order.setStatusLogs(orderMapper.selectStatusLogs(order.getOrderId()));
        order.setLogisticsEvents(orderMapper.selectLogisticsEvents(order.getOrderId()));
        return order;
    }

    private void insertLogisticsEvent(long orderId)
    {
        ShopOrderLogisticsEvent event = new ShopOrderLogisticsEvent();
        event.setOrderId(orderId);
        event.setEventCode("MERCHANT_SHIPPED");
        event.setDescription("商家已发货，等待承运商揽收");
        event.setSource("SYSTEM");
        event.setSourceEventId("MERCHANT_SHIPPED");
        if (orderMapper.insertLogisticsEvent(event) == 0)
        {
            throw new ServiceException("订单物流事件创建失败");
        }
    }

    private void insertStatusLog(long orderId, String fromStatus, String toStatus, long merchantId, String remark)
    {
        ShopOrderStatusLog log = new ShopOrderStatusLog();
        log.setOrderId(orderId);
        log.setFromStatus(fromStatus);
        log.setToStatus(toStatus);
        log.setOperatorType("MERCHANT");
        log.setOperatorId(merchantId);
        log.setRemark(remark);
        if (orderMapper.insertStatusLog(log) == 0)
        {
            throw new ServiceException("订单状态日志创建失败");
        }
    }
}
