package com.ruoyi.shop.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.shop.domain.vo.ShopNotificationView;
import com.ruoyi.shop.service.ShopNotificationService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ShopNotificationControllerTest
{
    private final ShopNotificationService service = mock(ShopNotificationService.class);
    private final ShopNotificationController controller = new ShopNotificationController(service);

    @Test
    void delegatesPaginationAndReturnsTheNotificationRows()
    {
        ShopNotificationView notification = new ShopNotificationView();
        notification.setNotificationId(31L);
        List<ShopNotificationView> rows = List.of(notification);
        when(service.notifications(2, 20)).thenReturn(rows);

        TableDataInfo result = controller.notifications(2, 20);

        assertSame(rows, result.getRows());
        assertEquals(1L, result.getTotal());
        verify(service).notifications(2, 20);
    }

    @Test
    void returnsUnreadCountInsideTheStandardSuccessPayload()
    {
        when(service.unreadCount()).thenReturn(7);

        AjaxResult result = controller.unreadCount();

        assertEquals(200, result.get(AjaxResult.CODE_TAG));
        assertEquals(7, ((Map<?, ?>) result.get(AjaxResult.DATA_TAG)).get("unreadCount"));
    }

    @Test
    void delegatesRecipientScopedReadCommandsWithoutAcceptingAClientUserId()
    {
        controller.markRead(41L);
        controller.markAllRead();

        verify(service).markRead(41L);
        verify(service).markAllRead();
    }
}
