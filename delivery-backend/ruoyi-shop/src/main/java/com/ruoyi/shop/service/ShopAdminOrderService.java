package com.ruoyi.shop.service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.mapper.ShopOrderMapper;

@Service
public class ShopAdminOrderService
{
    private final ShopOrderMapper orderMapper;

    public ShopAdminOrderService(ShopOrderMapper orderMapper)
    {
        this.orderMapper = orderMapper;
    }

    public List<ShopOrder> adminOrders(String status, String keyword)
    {
        return hydrateList(orderMapper.selectAdminOrders(status, keyword));
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
        orders.forEach(order -> order.setItems(
                itemsByOrder.getOrDefault(order.getOrderId(), Collections.emptyList())));
        return orders;
    }
}
