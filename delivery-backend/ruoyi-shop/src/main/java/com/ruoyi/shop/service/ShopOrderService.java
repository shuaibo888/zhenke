package com.ruoyi.shop.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopCartItem;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderAddress;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopOrderLogisticsEvent;
import com.ruoyi.shop.domain.ShopOrderRefund;
import com.ruoyi.shop.domain.ShopOrderStatusLog;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopUserAddress;
import com.ruoyi.shop.domain.dto.ShopOrderCreateBody;
import com.ruoyi.shop.domain.dto.ShopOrderItemBody;
import com.ruoyi.shop.domain.dto.ShopOrderRefundBody;
import com.ruoyi.shop.mapper.ShopCartMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopOrderService
{
    public static final String PENDING_PAYMENT = "PENDING_PAYMENT";
    public static final String PAID = "PAID";
    public static final String SHIPPED = "SHIPPED";
    public static final String RECEIVED = "RECEIVED";
    public static final String CANCELLED = "CANCELLED";
    public static final String REFUNDED = "REFUNDED";
    public static final String REFUND_PENDING = "PENDING";
    public static final String REFUND_APPROVED = "APPROVED";
    public static final String REFUND_REJECTED = "REJECTED";

    private static final DateTimeFormatter ORDER_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    private final ShopOrderMapper orderMapper;
    private final ShopCartMapper cartMapper;

    public ShopOrderService(ShopOrderMapper orderMapper, ShopCartMapper cartMapper)
    {
        this.orderMapper = orderMapper;
        this.cartMapper = cartMapper;
    }

    public List<ShopOrder> myOrders()
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        return orderMapper.selectUserOrders(userId).stream().map(this::hydrate).toList();
    }

    public ShopOrder myOrder(long orderId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        return hydrate(requireUserOrder(userId, orderId, false));
    }

    @Transactional
    public List<ShopOrder> create(ShopOrderCreateBody body)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        return createForUser(userId, body.getAddressId(), body.getItems());
    }

    @Transactional
    public List<ShopOrder> createFromCart(long addressId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        lockUser(userId);
        List<ShopCartItem> cartItems = cartMapper.selectUserItems(userId);
        if (cartItems.isEmpty())
        {
            throw new ServiceException("购物车为空");
        }
        List<ShopOrderItemBody> items = cartItems.stream().map(item -> {
            ShopOrderItemBody body = new ShopOrderItemBody();
            body.setProductId(item.getProductId());
            body.setQuantity(item.getQuantity());
            body.setSourceReportId(item.getSourceReportId());
            return body;
        }).toList();
        List<ShopOrder> orders = createForUser(userId, addressId, items);
        List<Long> productIds = items.stream().map(ShopOrderItemBody::getProductId).distinct().toList();
        cartMapper.deleteUserProducts(userId, productIds);
        return orders;
    }

    @Transactional
    public ShopOrder cancel(long orderId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = requireUserOrder(userId, orderId, true);
        if (!PENDING_PAYMENT.equals(order.getStatus()))
        {
            throw new ServiceException(CANCELLED.equals(order.getStatus()) ? "订单已取消，请勿重复操作" : "只有待付款订单可以取消");
        }
        if (orderMapper.updateStatus(userId, orderId, PENDING_PAYMENT, CANCELLED) == 0)
        {
            throw new ServiceException("订单状态已变化，请刷新后重试");
        }
        for (ShopOrderItem item : orderMapper.selectOrderItems(orderId))
        {
            if (orderMapper.restoreStock(item.getProductId(), item.getQuantity()) == 0)
            {
                throw new ServiceException("订单库存恢复失败");
            }
        }
        insertStatusLog(orderId, PENDING_PAYMENT, CANCELLED, userId, "用户取消待付款订单");
        return hydrate(requireUserOrder(userId, orderId, false));
    }

    @Transactional
    public ShopOrder pay(long orderId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = requireUserOrder(userId, orderId, true);
        if (!PENDING_PAYMENT.equals(order.getStatus()))
        {
            throw new ServiceException(PAID.equals(order.getStatus()) ? "订单已支付，请勿重复操作" : "只有待付款订单可以支付");
        }
        if (orderMapper.updateStatus(userId, orderId, PENDING_PAYMENT, PAID) == 0)
        {
            throw new ServiceException("订单状态已变化，请刷新后重试");
        }
        insertStatusLog(orderId, PENDING_PAYMENT, PAID, userId, "用户模拟支付订单");
        return hydrate(requireUserOrder(userId, orderId, false));
    }

    @Transactional
    public ShopOrder confirmReceived(long orderId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = requireUserOrder(userId, orderId, true);
        if (!SHIPPED.equals(order.getStatus()))
        {
            throw new ServiceException(RECEIVED.equals(order.getStatus()) ? "订单已确认收货，请勿重复操作" : "只有已发货订单可以确认收货");
        }
        if (orderMapper.updateStatus(userId, orderId, SHIPPED, RECEIVED) == 0)
        {
            throw new ServiceException("订单状态已变化，请刷新后重试");
        }
        insertStatusLog(orderId, SHIPPED, RECEIVED, userId, "用户确认收货");
        insertLogisticsEvent(orderId, "USER_RECEIVED", "用户已确认收货", "USER_RECEIVED");
        return hydrate(requireUserOrder(userId, orderId, false));
    }

    @Transactional
    public ShopOrder requestRefund(long orderId, ShopOrderRefundBody body)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = requireUserOrder(userId, orderId, true);
        String reason = StringUtils.trim(body.getReason());
        if (StringUtils.isEmpty(reason) || reason.length() < 2 || reason.length() > 200)
        {
            throw new ServiceException("退款原因长度必须在2到200个字之间");
        }
        ShopOrderRefund latest = orderMapper.selectLatestRefund(orderId);
        if (latest != null && REFUND_PENDING.equals(latest.getRefundStatus()))
        {
            throw new ServiceException("退款申请正在等待商家审核，请勿重复提交");
        }
        if (SHIPPED.equals(order.getStatus()))
        {
            throw new ServiceException("订单已发货，请先确认收货后再申请退款");
        }
        if (REFUNDED.equals(order.getStatus()))
        {
            throw new ServiceException("订单已退款，请勿重复申请");
        }
        if (PAID.equals(order.getStatus()))
        {
            if (orderMapper.updateStatus(userId, orderId, PAID, REFUNDED) == 0)
            {
                throw new ServiceException("订单状态已变化，请刷新后重试");
            }
            for (ShopOrderItem item : orderMapper.selectOrderItems(orderId))
            {
                if (orderMapper.restoreStock(item.getProductId(), item.getQuantity()) == 0)
                {
                    throw new ServiceException("订单库存恢复失败");
                }
            }
            insertRefund(order, reason, REFUND_APPROVED, "0", "待发货订单自动退款");
            insertStatusLog(orderId, PAID, REFUNDED, userId, "用户申请待发货订单退款，系统自动处理");
            return hydrate(requireUserOrder(userId, orderId, false));
        }
        if (RECEIVED.equals(order.getStatus()))
        {
            insertRefund(order, reason, REFUND_PENDING, "1", null);
            return hydrate(requireUserOrder(userId, orderId, false));
        }
        throw new ServiceException(PENDING_PAYMENT.equals(order.getStatus())
                ? "待付款订单请直接取消" : "当前订单状态不能申请退款");
    }

    private List<ShopOrder> createForUser(long userId, long addressId, List<ShopOrderItemBody> requestedItems)
    {
        ShopUserAddress address = orderMapper.selectUserAddress(userId, addressId);
        if (address == null)
        {
            throw new ServiceException("收货地址不存在");
        }

        Map<Long, RequestedLine> normalized = normalizeItems(requestedItems);
        Map<Long, List<OrderLine>> linesByMerchant = new LinkedHashMap<>();
        for (Map.Entry<Long, RequestedLine> requested : normalized.entrySet())
        {
            ShopProduct product = orderMapper.selectOrderableProductForUpdate(requested.getKey());
            if (product == null)
            {
                throw new ServiceException("商品不存在或已下架");
            }
            int quantity = requested.getValue().quantity();
            Long sourceReportId = requested.getValue().sourceReportId();
            if (sourceReportId != null
                    && orderMapper.countPublishedReportForProduct(sourceReportId, product.getProductId()) == 0)
            {
                throw new ServiceException("甄客验购买来源无效");
            }
            if (product.getStock() == null || product.getStock() < quantity
                    || orderMapper.deductStock(product.getProductId(), quantity) == 0)
            {
                throw new ServiceException(product.getProductName() + "库存不足");
            }
            linesByMerchant.computeIfAbsent(product.getMerchantId(), ignored -> new ArrayList<>())
                    .add(new OrderLine(product, quantity, sourceReportId));
        }

        List<ShopOrder> created = new ArrayList<>();
        for (Map.Entry<Long, List<OrderLine>> merchantEntry : linesByMerchant.entrySet())
        {
            ShopOrder order = new ShopOrder();
            order.setOrderNo(newOrderNo());
            order.setUserId(userId);
            order.setMerchantId(merchantEntry.getKey());
            order.setStatus(PENDING_PAYMENT);
            order.setItemCount(merchantEntry.getValue().stream().mapToInt(OrderLine::quantity).sum());
            order.setTotalAmount(merchantEntry.getValue().stream()
                    .map(line -> line.product().getPrice().multiply(BigDecimal.valueOf(line.quantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            if (orderMapper.insertOrder(order) == 0)
            {
                throw new ServiceException("订单创建失败");
            }

            for (OrderLine line : merchantEntry.getValue())
            {
                ShopOrderItem item = new ShopOrderItem();
                item.setOrderId(order.getOrderId());
                item.setProductId(line.product().getProductId());
                item.setSourceReportId(line.sourceReportId());
                item.setProductName(line.product().getProductName());
                item.setCoverUrl(line.product().getCoverUrl());
                item.setUnitPrice(line.product().getPrice());
                item.setQuantity(line.quantity());
                item.setLineAmount(line.product().getPrice().multiply(BigDecimal.valueOf(line.quantity())));
                if (orderMapper.insertOrderItem(item) == 0)
                {
                    throw new ServiceException("订单明细创建失败");
                }
            }
            insertAddressSnapshot(order.getOrderId(), address);
            insertStatusLog(order.getOrderId(), null, PENDING_PAYMENT, userId, "用户提交订单");
            created.add(hydrate(requireUserOrder(userId, order.getOrderId(), false)));
        }
        return created;
    }

    private Map<Long, RequestedLine> normalizeItems(List<ShopOrderItemBody> items)
    {
        if (items == null || items.isEmpty())
        {
            throw new ServiceException("订单商品不能为空");
        }
        Map<Long, RequestedLine> normalized = new TreeMap<>();
        for (ShopOrderItemBody item : items)
        {
            if (item == null || item.getProductId() == null || item.getQuantity() == null
                    || item.getQuantity() < 1 || item.getQuantity() > 99)
            {
                throw new ServiceException("订单商品参数无效");
            }
            RequestedLine existing = normalized.get(item.getProductId());
            int quantity = item.getQuantity() + (existing == null ? 0 : existing.quantity());
            if (quantity > 99)
            {
                throw new ServiceException("单个商品最多购买99件");
            }
            Long sourceReportId = item.getSourceReportId() != null
                    ? item.getSourceReportId()
                    : existing == null ? null : existing.sourceReportId();
            normalized.put(item.getProductId(), new RequestedLine(quantity, sourceReportId));
        }
        if (normalized.size() > 50)
        {
            throw new ServiceException("一次最多提交50种商品");
        }
        return normalized;
    }

    private void lockUser(long userId)
    {
        if (cartMapper.lockEnabledUser(userId) == null)
        {
            throw new ServiceException("商城用户不存在或已停用");
        }
    }

    private void insertAddressSnapshot(long orderId, ShopUserAddress source)
    {
        ShopOrderAddress address = new ShopOrderAddress();
        address.setOrderId(orderId);
        address.setRecipient(source.getRecipient());
        address.setPhone(source.getPhone());
        address.setProvinceCode(source.getProvinceCode());
        address.setCityCode(source.getCityCode());
        address.setDistrictCode(source.getDistrictCode());
        address.setDetail(source.getDetail());
        if (orderMapper.insertOrderAddress(address) == 0)
        {
            throw new ServiceException("订单地址快照创建失败");
        }
    }

    private void insertStatusLog(long orderId, String fromStatus, String toStatus, long operatorId, String remark)
    {
        ShopOrderStatusLog log = new ShopOrderStatusLog();
        log.setOrderId(orderId);
        log.setFromStatus(fromStatus);
        log.setToStatus(toStatus);
        log.setOperatorType("SHOP_USER");
        log.setOperatorId(operatorId);
        log.setRemark(remark);
        if (orderMapper.insertStatusLog(log) == 0)
        {
            throw new ServiceException("订单状态日志创建失败");
        }
    }

    private void insertRefund(ShopOrder order, String reason, String status, String reviewRequired, String auditRemark)
    {
        ShopOrderRefund refund = new ShopOrderRefund();
        refund.setOrderId(order.getOrderId());
        refund.setUserId(order.getUserId());
        refund.setMerchantId(order.getMerchantId());
        refund.setRefundStatus(status);
        refund.setRefundReason(reason);
        refund.setReviewRequired(reviewRequired);
        refund.setAuditRemark(auditRemark);
        if (orderMapper.insertRefund(refund) == 0)
        {
            throw new ServiceException("退款申请创建失败");
        }
    }

    private void insertLogisticsEvent(long orderId, String eventCode, String description, String sourceEventId)
    {
        ShopOrderLogisticsEvent event = new ShopOrderLogisticsEvent();
        event.setOrderId(orderId);
        event.setEventCode(eventCode);
        event.setDescription(description);
        event.setSource("SYSTEM");
        event.setSourceEventId(sourceEventId);
        if (orderMapper.insertLogisticsEvent(event) == 0)
        {
            throw new ServiceException("订单物流事件创建失败");
        }
    }

    private ShopOrder requireUserOrder(long userId, long orderId, boolean forUpdate)
    {
        ShopOrder order = forUpdate
                ? orderMapper.selectUserOrderForUpdate(userId, orderId)
                : orderMapper.selectUserOrder(userId, orderId);
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

    private String newOrderNo()
    {
        return "ZK" + ORDER_TIME.format(LocalDateTime.now())
                + UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    }

    private record RequestedLine(int quantity, Long sourceReportId) { }
    private record OrderLine(ShopProduct product, int quantity, Long sourceReportId) { }
}
