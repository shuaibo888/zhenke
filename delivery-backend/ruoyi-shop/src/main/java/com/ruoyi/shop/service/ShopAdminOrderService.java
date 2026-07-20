package com.ruoyi.shop.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.mapper.ShopOrderMapper;

@Service
public class ShopAdminOrderService
{
    private final ShopOrderMapper orderMapper;

    public ShopAdminOrderService(ShopOrderMapper orderMapper)
    {
        this.orderMapper = orderMapper;
    }

    public List<ShopOrder> adminOrders()
    {
        return orderMapper.selectAdminOrders().stream().map(this::hydrate).toList();
    }

    public ShopOrder adminOrder(long orderId)
    {
        ShopOrder order = orderMapper.selectAdminOrder(orderId);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        return hydrate(order);
    }

    private ShopOrder hydrate(ShopOrder order)
    {
        order.setItems(orderMapper.selectOrderItems(order.getOrderId()));
        order.setAddress(orderMapper.selectOrderAddress(order.getOrderId()));
        order.setStatusLogs(orderMapper.selectStatusLogs(order.getOrderId()));
        order.setLogisticsEvents(orderMapper.selectLogisticsEvents(order.getOrderId()));
        order.setRefundLogs(orderMapper.selectRefundLogs(order.getOrderId()));
        return order;
    }
}
