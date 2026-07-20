package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderAddress;
import com.ruoyi.shop.domain.ShopOrderItem;
import com.ruoyi.shop.domain.ShopOrderRefundLog;
import com.ruoyi.shop.domain.ShopOrderStatusLog;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopUserAddress;
import com.ruoyi.shop.domain.dto.ShopOrderCreateBody;
import com.ruoyi.shop.domain.dto.ShopOrderItemBody;
import com.ruoyi.shop.mapper.ShopCartMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;

class ShopOrderServiceTest
{
    private static final long USER_ID = 7L;

    @Test
    void createUsesServerPriceAndCopiesAddressSnapshot()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopCartMapper cartMapper = mock(ShopCartMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, cartMapper);
        ShopUserAddress address = address();
        ShopProduct product = product(10L, 8, "128.50");
        when(orderMapper.selectUserAddress(USER_ID, 3L)).thenReturn(address);
        when(cartMapper.lockEnabledUser(USER_ID)).thenReturn(USER_ID);
        when(orderMapper.selectOrderableProductForUpdate(10L)).thenReturn(product);
        when(orderMapper.deductStock(10L, 2)).thenReturn(1);
        when(orderMapper.insertOrder(any())).thenAnswer(invocation -> {
            ShopOrder inserting = invocation.getArgument(0);
            inserting.setOrderId(21L);
            return 1;
        });
        when(orderMapper.insertOrderItem(any())).thenReturn(1);
        when(orderMapper.insertOrderAddress(any())).thenReturn(1);
        when(orderMapper.insertStatusLog(any())).thenReturn(1);
        ShopOrder stored = new ShopOrder();
        stored.setOrderId(21L);
        stored.setUserId(USER_ID);
        stored.setStatus(ShopOrderService.PENDING_PAYMENT);
        when(orderMapper.selectUserOrder(USER_ID, 21L)).thenReturn(stored);
        when(orderMapper.selectOrderItems(21L)).thenReturn(List.of());
        when(orderMapper.selectStatusLogs(21L)).thenReturn(List.of());

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            service.create(orderBody(10L, 2));
        }

        ArgumentCaptor<ShopOrder> orderCaptor = ArgumentCaptor.forClass(ShopOrder.class);
        verify(orderMapper).insertOrder(orderCaptor.capture());
        assertEquals(new BigDecimal("257.00"), orderCaptor.getValue().getTotalAmount());
        ArgumentCaptor<ShopOrderAddress> addressCaptor = ArgumentCaptor.forClass(ShopOrderAddress.class);
        verify(orderMapper).insertOrderAddress(addressCaptor.capture());
        address.setRecipient("后来修改的收货人");
        assertEquals("测试用户", addressCaptor.getValue().getRecipient());
    }

    @Test
    void createRejectsInsufficientStockBeforeWritingOrder()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopCartMapper cartMapper = mock(ShopCartMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, cartMapper);
        when(cartMapper.lockEnabledUser(USER_ID)).thenReturn(USER_ID);
        when(orderMapper.selectUserAddress(USER_ID, 3L)).thenReturn(address());
        when(orderMapper.selectOrderableProductForUpdate(10L)).thenReturn(product(10L, 1, "128.50"));

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> service.create(orderBody(10L, 2)));
        }

        verify(orderMapper, never()).insertOrder(any());
        verify(orderMapper, never()).deductStock(anyLong(), any());
    }

    @Test
    void cancelCannotAccessAnotherUsersOrder()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, mock(ShopCartMapper.class));
        when(orderMapper.selectUserOrderForUpdate(USER_ID, 99L)).thenReturn(null);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> service.cancel(99L));
        }

        verify(orderMapper, never()).updateStatus(anyLong(), anyLong(), any(), any());
        verify(orderMapper, never()).restoreStock(anyLong(), any());
    }

    @Test
    void repeatedCancelDoesNotRestoreStockAgain()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, mock(ShopCartMapper.class));
        ShopOrder cancelled = new ShopOrder();
        cancelled.setOrderId(21L);
        cancelled.setUserId(USER_ID);
        cancelled.setStatus(ShopOrderService.CANCELLED);
        when(orderMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(cancelled);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> service.cancel(21L));
        }

        verify(orderMapper, never()).restoreStock(anyLong(), any());
    }

    @Test
    void cancelPaidUnshippedOrderRestoresStockAndCompletesSimulatedRefund()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, mock(ShopCartMapper.class));
        ShopOrder paid = order(21L, ShopOrderService.PAID);
        paid.setRefundStatus(ShopOrderService.REFUND_NONE);
        ShopOrderItem item = new ShopOrderItem();
        item.setProductId(10L);
        item.setQuantity(2);
        ShopOrder refunded = order(21L, ShopOrderService.CANCELLED);
        refunded.setRefundStatus(ShopOrderService.REFUND_REFUNDED);
        when(orderMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(paid);
        when(orderMapper.cancelPaidAndApproveRefund(USER_ID, 21L)).thenReturn(1);
        when(orderMapper.selectOrderItems(21L)).thenReturn(List.of(item));
        when(orderMapper.restoreStock(10L, 2)).thenReturn(1);
        when(orderMapper.insertStatusLog(any())).thenReturn(1);
        when(orderMapper.insertRefundLog(any())).thenReturn(1);
        when(orderMapper.completeUserRefund(USER_ID, 21L)).thenReturn(1);
        when(orderMapper.selectUserOrder(USER_ID, 21L)).thenReturn(refunded);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            ShopOrder result = service.cancel(21L);
            assertEquals(ShopOrderService.CANCELLED, result.getStatus());
            assertEquals(ShopOrderService.REFUND_REFUNDED, result.getRefundStatus());
        }

        verify(orderMapper).restoreStock(10L, 2);
        verify(orderMapper, times(2)).insertRefundLog(any(ShopOrderRefundLog.class));
    }

    @Test
    void applyRefundOnPaidUnshippedOrderIsAutomaticallyApprovedAndCompleted()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, mock(ShopCartMapper.class));
        ShopOrder paid = order(21L, ShopOrderService.PAID);
        paid.setRefundStatus(ShopOrderService.REFUND_NONE);
        ShopOrderItem item = new ShopOrderItem();
        item.setProductId(10L);
        item.setQuantity(1);
        ShopOrder refunded = order(21L, ShopOrderService.CANCELLED);
        refunded.setRefundStatus(ShopOrderService.REFUND_REFUNDED);
        when(orderMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(paid);
        when(orderMapper.cancelPaidAndApproveRefund(USER_ID, 21L)).thenReturn(1);
        when(orderMapper.selectOrderItems(21L)).thenReturn(List.of(item));
        when(orderMapper.restoreStock(10L, 1)).thenReturn(1);
        when(orderMapper.insertStatusLog(any())).thenReturn(1);
        when(orderMapper.insertRefundLog(any())).thenReturn(1);
        when(orderMapper.completeUserRefund(USER_ID, 21L)).thenReturn(1);
        when(orderMapper.selectUserOrder(USER_ID, 21L)).thenReturn(refunded);

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertEquals(ShopOrderService.REFUND_REFUNDED, service.applyRefund(21L).getRefundStatus());
        }

        verify(orderMapper).restoreStock(10L, 1);
        verify(orderMapper, times(2)).insertRefundLog(any(ShopOrderRefundLog.class));
    }

    @Test
    void payUpdatesCurrentUsersPendingOrderAndWritesOneLog()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, mock(ShopCartMapper.class));
        when(orderMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(order(21L, ShopOrderService.PENDING_PAYMENT));
        when(orderMapper.updateStatus(USER_ID, 21L, ShopOrderService.PENDING_PAYMENT, ShopOrderService.PAID)).thenReturn(1);
        when(orderMapper.insertStatusLog(any())).thenReturn(1);
        when(orderMapper.selectUserOrder(USER_ID, 21L)).thenReturn(order(21L, ShopOrderService.PAID));
        when(orderMapper.selectOrderItems(21L)).thenReturn(List.of());
        when(orderMapper.selectStatusLogs(21L)).thenReturn(List.of());

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertEquals(ShopOrderService.PAID, service.pay(21L).getStatus());
        }

        ArgumentCaptor<ShopOrderStatusLog> logCaptor = ArgumentCaptor.forClass(ShopOrderStatusLog.class);
        verify(orderMapper, times(1)).insertStatusLog(logCaptor.capture());
        assertEquals(ShopOrderService.PENDING_PAYMENT, logCaptor.getValue().getFromStatus());
        assertEquals(ShopOrderService.PAID, logCaptor.getValue().getToStatus());
    }

    @Test
    void payRejectsAnotherUsersOrderAndRepeatedOperation()
    {
        ShopOrderMapper otherUserMapper = mock(ShopOrderMapper.class);
        ShopOrderService otherUserService = new ShopOrderService(otherUserMapper, mock(ShopCartMapper.class));
        when(otherUserMapper.selectUserOrderForUpdate(USER_ID, 99L)).thenReturn(null);
        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> otherUserService.pay(99L));
        }
        verify(otherUserMapper, never()).updateStatus(anyLong(), anyLong(), any(), any());

        ShopOrderMapper repeatedMapper = mock(ShopOrderMapper.class);
        ShopOrderService repeatedService = new ShopOrderService(repeatedMapper, mock(ShopCartMapper.class));
        when(repeatedMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(order(21L, ShopOrderService.PAID));
        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> repeatedService.pay(21L));
        }
        verify(repeatedMapper, never()).updateStatus(anyLong(), anyLong(), any(), any());
        verify(repeatedMapper, never()).insertStatusLog(any());
    }

    @Test
    void confirmReceivedUpdatesShippedOrderAndWritesOneLog()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, mock(ShopCartMapper.class));
        when(orderMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(order(21L, ShopOrderService.SHIPPED));
        when(orderMapper.updateStatus(USER_ID, 21L, ShopOrderService.SHIPPED, ShopOrderService.RECEIVED)).thenReturn(1);
        when(orderMapper.insertStatusLog(any())).thenReturn(1);
        when(orderMapper.insertLogisticsEvent(any())).thenReturn(1);
        when(orderMapper.selectUserOrder(USER_ID, 21L)).thenReturn(order(21L, ShopOrderService.RECEIVED));
        when(orderMapper.selectOrderItems(21L)).thenReturn(List.of());
        when(orderMapper.selectStatusLogs(21L)).thenReturn(List.of());

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertEquals(ShopOrderService.RECEIVED, service.confirmReceived(21L).getStatus());
        }

        ArgumentCaptor<ShopOrderStatusLog> logCaptor = ArgumentCaptor.forClass(ShopOrderStatusLog.class);
        verify(orderMapper, times(1)).insertStatusLog(logCaptor.capture());
        assertEquals(ShopOrderService.SHIPPED, logCaptor.getValue().getFromStatus());
        assertEquals(ShopOrderService.RECEIVED, logCaptor.getValue().getToStatus());
    }

    @Test
    void confirmReceivedRejectsAnotherUserAndInvalidStatus()
    {
        ShopOrderMapper otherUserMapper = mock(ShopOrderMapper.class);
        ShopOrderService otherUserService = new ShopOrderService(otherUserMapper, mock(ShopCartMapper.class));
        when(otherUserMapper.selectUserOrderForUpdate(USER_ID, 99L)).thenReturn(null);
        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> otherUserService.confirmReceived(99L));
        }
        verify(otherUserMapper, never()).updateStatus(anyLong(), anyLong(), any(), any());

        ShopOrderMapper paidMapper = mock(ShopOrderMapper.class);
        ShopOrderService paidService = new ShopOrderService(paidMapper, mock(ShopCartMapper.class));
        when(paidMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(order(21L, ShopOrderService.RECEIVED));
        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> paidService.confirmReceived(21L));
        }
        verify(paidMapper, never()).updateStatus(anyLong(), anyLong(), any(), any());
        verify(paidMapper, never()).insertStatusLog(any());
    }

    @Test
    void applyRefundOnReceivedOrderWaitsForMerchantAuditWithoutChangingMainStatus()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopOrderService service = new ShopOrderService(orderMapper, mock(ShopCartMapper.class));
        ShopOrder received = order(21L, ShopOrderService.RECEIVED);
        received.setRefundStatus(ShopOrderService.REFUND_NONE);
        ShopOrder applied = order(21L, ShopOrderService.RECEIVED);
        applied.setRefundStatus(ShopOrderService.REFUND_APPLIED);
        when(orderMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(received);
        when(orderMapper.applyRefund(USER_ID, 21L)).thenReturn(1);
        when(orderMapper.insertRefundLog(any())).thenReturn(1);
        when(orderMapper.selectUserOrder(USER_ID, 21L)).thenReturn(applied);
        when(orderMapper.selectOrderItems(21L)).thenReturn(List.of());
        when(orderMapper.selectStatusLogs(21L)).thenReturn(List.of());
        when(orderMapper.selectLogisticsEvents(21L)).thenReturn(List.of());

        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            ShopOrder result = service.applyRefund(21L);
            assertEquals(ShopOrderService.RECEIVED, result.getStatus());
            assertEquals(ShopOrderService.REFUND_APPLIED, result.getRefundStatus());
        }

        verify(orderMapper, never()).updateStatus(anyLong(), anyLong(), any(), any());
        verify(orderMapper, never()).insertStatusLog(any());
        verify(orderMapper).insertRefundLog(any(ShopOrderRefundLog.class));
    }

    @Test
    void applyRefundRejectsAnotherUserInvalidStatusAndRepeatedRequest()
    {
        ShopOrderMapper otherUserMapper = mock(ShopOrderMapper.class);
        ShopOrderService otherUserService = new ShopOrderService(otherUserMapper, mock(ShopCartMapper.class));
        when(otherUserMapper.selectUserOrderForUpdate(USER_ID, 99L)).thenReturn(null);
        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> otherUserService.applyRefund(99L));
        }
        verify(otherUserMapper, never()).applyRefund(anyLong(), anyLong());

        ShopOrderMapper unpaidMapper = mock(ShopOrderMapper.class);
        ShopOrderService unpaidService = new ShopOrderService(unpaidMapper, mock(ShopCartMapper.class));
        ShopOrder shipped = order(21L, ShopOrderService.SHIPPED);
        shipped.setRefundStatus(ShopOrderService.REFUND_NONE);
        when(unpaidMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(shipped);
        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> unpaidService.applyRefund(21L));
        }
        verify(unpaidMapper, never()).applyRefund(anyLong(), anyLong());

        ShopOrderMapper repeatedMapper = mock(ShopOrderMapper.class);
        ShopOrderService repeatedService = new ShopOrderService(repeatedMapper, mock(ShopCartMapper.class));
        ShopOrder repeated = order(21L, ShopOrderService.RECEIVED);
        repeated.setRefundStatus(ShopOrderService.REFUND_APPLIED);
        when(repeatedMapper.selectUserOrderForUpdate(USER_ID, 21L)).thenReturn(repeated);
        try (MockedStatic<SecurityUtils> security = shopUserLogin())
        {
            assertThrows(ServiceException.class, () -> repeatedService.applyRefund(21L));
        }
        verify(repeatedMapper, never()).applyRefund(anyLong(), anyLong());
    }

    private static ShopOrderCreateBody orderBody(long productId, int quantity)
    {
        ShopOrderItemBody item = new ShopOrderItemBody();
        item.setProductId(productId);
        item.setQuantity(quantity);
        ShopOrderCreateBody body = new ShopOrderCreateBody();
        body.setAddressId(3L);
        body.setItems(List.of(item));
        return body;
    }

    private static ShopProduct product(long productId, int stock, String price)
    {
        ShopProduct product = new ShopProduct();
        product.setProductId(productId);
        product.setMerchantId(5L);
        product.setProductName("测试商品");
        product.setCoverUrl("/cover.jpg");
        product.setPrice(new BigDecimal(price));
        product.setStock(stock);
        product.setStatus("ON_SALE");
        return product;
    }

    private static ShopUserAddress address()
    {
        ShopUserAddress address = new ShopUserAddress();
        address.setAddressId(3L);
        address.setUserId(USER_ID);
        address.setRecipient("测试用户");
        address.setPhone("13800000000");
        address.setProvinceCode("61");
        address.setCityCode("6101");
        address.setDistrictCode("610113");
        address.setDetail("测试路18号");
        return address;
    }

    private static ShopOrder order(long orderId, String status)
    {
        ShopOrder order = new ShopOrder();
        order.setOrderId(orderId);
        order.setUserId(USER_ID);
        order.setStatus(status);
        return order;
    }

    private static MockedStatic<SecurityUtils> shopUserLogin()
    {
        LoginUser loginUser = new LoginUser(
                ShopAccountIdentity.toPrincipalId(USER_ID), null, new SysUser(),
                Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class);
        security.when(SecurityUtils::getLoginUser).thenReturn(loginUser);
        return security;
    }
}
