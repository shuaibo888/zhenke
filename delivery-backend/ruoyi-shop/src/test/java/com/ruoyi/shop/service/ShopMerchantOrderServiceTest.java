package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.domain.ShopOrderStatusLog;
import com.ruoyi.shop.domain.dto.ShopOrderShipBody;
import com.ruoyi.shop.mapper.ShopOrderMapper;

class ShopMerchantOrderServiceTest
{
    private static final long MERCHANT_ID = 5L;

    @Test
    void merchantCannotViewAnotherMerchantsOrder()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopMerchantOrderService service = new ShopMerchantOrderService(orderMapper, merchantService());
        when(orderMapper.selectMerchantOrder(MERCHANT_ID, 99L)).thenReturn(null);

        assertThrows(ServiceException.class, () -> service.merchantOrder(99L));
        verify(orderMapper).selectMerchantOrder(MERCHANT_ID, 99L);
    }

    @Test
    void shipUpdatesPaidOrderAndWritesOneLog()
    {
        ShopOrderMapper orderMapper = mock(ShopOrderMapper.class);
        ShopMerchantOrderService service = new ShopMerchantOrderService(orderMapper, merchantService());
        when(orderMapper.selectMerchantOrderForUpdate(MERCHANT_ID, 21L)).thenReturn(order(ShopOrderService.PAID));
        when(orderMapper.shipOrder(MERCHANT_ID, 21L, "顺丰速运", "SF123456")).thenReturn(1);
        when(orderMapper.insertStatusLog(any())).thenReturn(1);
        when(orderMapper.selectMerchantOrder(MERCHANT_ID, 21L)).thenReturn(order(ShopOrderService.SHIPPED));
        when(orderMapper.selectOrderItems(21L)).thenReturn(List.of());
        when(orderMapper.selectStatusLogs(21L)).thenReturn(List.of());

        assertEquals(ShopOrderService.SHIPPED, service.ship(21L, shipBody("  顺丰速运  ", "  SF123456  ")).getStatus());

        ArgumentCaptor<ShopOrderStatusLog> logCaptor = ArgumentCaptor.forClass(ShopOrderStatusLog.class);
        verify(orderMapper, times(1)).insertStatusLog(logCaptor.capture());
        assertEquals(ShopOrderService.PAID, logCaptor.getValue().getFromStatus());
        assertEquals(ShopOrderService.SHIPPED, logCaptor.getValue().getToStatus());
        assertEquals("MERCHANT", logCaptor.getValue().getOperatorType());
        assertEquals(MERCHANT_ID, logCaptor.getValue().getOperatorId());
    }

    @Test
    void shipRejectsAnotherMerchantNonPaidAndBlankLogistics()
    {
        ShopOrderMapper otherMapper = mock(ShopOrderMapper.class);
        ShopMerchantOrderService otherService = new ShopMerchantOrderService(otherMapper, merchantService());
        when(otherMapper.selectMerchantOrderForUpdate(MERCHANT_ID, 99L)).thenReturn(null);
        assertThrows(ServiceException.class, () -> otherService.ship(99L, shipBody("顺丰速运", "SF123")));
        verify(otherMapper, never()).shipOrder(MERCHANT_ID, 99L, "顺丰速运", "SF123");

        ShopOrderMapper pendingMapper = mock(ShopOrderMapper.class);
        ShopMerchantOrderService pendingService = new ShopMerchantOrderService(pendingMapper, merchantService());
        when(pendingMapper.selectMerchantOrderForUpdate(MERCHANT_ID, 21L)).thenReturn(order(ShopOrderService.SHIPPED));
        assertThrows(ServiceException.class, () -> pendingService.ship(21L, shipBody("顺丰速运", "SF123")));
        verify(pendingMapper, never()).insertStatusLog(any());

        ShopOrderMapper blankMapper = mock(ShopOrderMapper.class);
        ShopMerchantOrderService blankService = new ShopMerchantOrderService(blankMapper, merchantService());
        when(blankMapper.selectMerchantOrderForUpdate(MERCHANT_ID, 21L)).thenReturn(order(ShopOrderService.PAID));
        assertThrows(ServiceException.class, () -> blankService.ship(21L, shipBody("   ", "SF123")));
        verify(blankMapper, never()).insertStatusLog(any());
    }

    private static ShopMerchantService merchantService()
    {
        ShopMerchantService service = mock(ShopMerchantService.class);
        ShopMerchant merchant = new ShopMerchant();
        merchant.setMerchantId(MERCHANT_ID);
        when(service.currentMerchantAccount()).thenReturn(merchant);
        return service;
    }

    private static ShopOrder order(String status)
    {
        ShopOrder order = new ShopOrder();
        order.setOrderId(21L);
        order.setMerchantId(MERCHANT_ID);
        order.setStatus(status);
        return order;
    }

    private static ShopOrderShipBody shipBody(String carrier, String trackingNo)
    {
        ShopOrderShipBody body = new ShopOrderShipBody();
        body.setCarrier(carrier);
        body.setTrackingNo(trackingNo);
        return body;
    }
}
