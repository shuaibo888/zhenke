package com.ruoyi.shop.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderStatusLog;
import com.ruoyi.shop.domain.dto.ShopOrderShipBody;
import com.ruoyi.shop.mapper.ShopOrderMapper;

@Service
public class ShopMerchantOrderService
{
    private final ShopOrderMapper orderMapper;
    private final ShopMerchantService merchantService;

    public ShopMerchantOrderService(ShopOrderMapper orderMapper, ShopMerchantService merchantService)
    {
        this.orderMapper = orderMapper;
        this.merchantService = merchantService;
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
        String carrier = StringUtils.trim(body.getCarrier());
        String trackingNo = StringUtils.trim(body.getTrackingNo());
        if (StringUtils.isEmpty(carrier) || StringUtils.isEmpty(trackingNo))
        {
            throw new ServiceException("物流公司和物流单号不能为空");
        }
        if (carrier.length() > 50 || trackingNo.length() > 100)
        {
            throw new ServiceException("物流公司或物流单号长度超出限制");
        }
        if (orderMapper.shipOrder(merchantId, orderId, carrier, trackingNo) == 0)
        {
            throw new ServiceException("订单状态已变化，请刷新后重试");
        }
        insertStatusLog(orderId, merchantId);
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
        return order;
    }

    private void insertStatusLog(long orderId, long merchantId)
    {
        ShopOrderStatusLog log = new ShopOrderStatusLog();
        log.setOrderId(orderId);
        log.setFromStatus(ShopOrderService.PAID);
        log.setToStatus(ShopOrderService.SHIPPED);
        log.setOperatorType("MERCHANT");
        log.setOperatorId(merchantId);
        log.setRemark("商家发货");
        if (orderMapper.insertStatusLog(log) == 0)
        {
            throw new ServiceException("订单状态日志创建失败");
        }
    }
}
