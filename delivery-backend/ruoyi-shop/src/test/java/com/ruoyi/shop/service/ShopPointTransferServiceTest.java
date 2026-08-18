package com.ruoyi.shop.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.ruoyi.shop.domain.ShopPointTransfer;
import com.ruoyi.shop.points.EventPointsClient;
import com.ruoyi.shop.points.EventPointsException;
import com.ruoyi.shop.points.EventPointsTransferResult;

class ShopPointTransferServiceTest
{
    private final EventPointsClient eventPointsClient = mock(EventPointsClient.class);
    private final ShopPointTransferTransaction transferTransaction = mock(ShopPointTransferTransaction.class);
    private final ShopAccountService accountService = mock(ShopAccountService.class);
    private final ShopPointTransferService transferService = new ShopPointTransferService(
            eventPointsClient, transferTransaction, accountService);

    @Test
    void retriesPendingRequestAndSettlesReturnedSuccess()
    {
        ShopPointTransfer transfer = pendingTransfer();
        when(transferTransaction.pendingTransfersForRetry()).thenReturn(List.of(transfer));
        when(eventPointsClient.transfer("PT-1", "13800138000", 60))
                .thenReturn(new EventPointsTransferResult("PT-1", "EVENT-1", 60, 40));

        transferService.retryPendingTransfers();

        verify(transferTransaction).settleTransfer("PT-1", 9L, 60, "EVENT-1");
        verify(transferTransaction, never()).failTransfer("PT-1", null, null);
    }

    @Test
    void keepsPendingWhenRetryOutcomeIsStillUncertain()
    {
        ShopPointTransfer transfer = pendingTransfer();
        when(transferTransaction.pendingTransfersForRetry()).thenReturn(List.of(transfer));
        when(eventPointsClient.transfer("PT-1", "13800138000", 60))
                .thenThrow(new EventPointsException(null, null, "timeout"));

        transferService.retryPendingTransfers();

        verify(transferTransaction, never()).settleTransfer("PT-1", 9L, 60, "EVENT-1");
        verify(transferTransaction, never()).failTransfer("PT-1", null, "timeout");
    }

    @Test
    void endsPendingRequestWhenUpstreamClearlyRejectsIt()
    {
        ShopPointTransfer transfer = pendingTransfer();
        when(transferTransaction.pendingTransfersForRetry()).thenReturn(List.of(transfer));
        when(eventPointsClient.transfer("PT-1", "13800138000", 60))
                .thenThrow(new EventPointsException("INSUFFICIENT_POINTS", 40L, "insufficient"));

        transferService.retryPendingTransfers();

        verify(transferTransaction).failTransfer("PT-1", "INSUFFICIENT_POINTS", "insufficient");
        verify(transferTransaction, never()).settleTransfer("PT-1", 9L, 60, "EVENT-1");
    }

    @Test
    void endsPendingRequestWhenRetryReturnsExplicitConfigurationFailure()
    {
        ShopPointTransfer transfer = pendingTransfer();
        when(transferTransaction.pendingTransfersForRetry()).thenReturn(List.of(transfer));
        when(eventPointsClient.transfer("PT-1", "13800138000", 60))
                .thenThrow(new EventPointsException("NOT_CONFIGURED", null, "not configured"));

        transferService.retryPendingTransfers();

        verify(transferTransaction).failTransfer("PT-1", "NOT_CONFIGURED", "not configured");
        verify(transferTransaction, never()).settleTransfer("PT-1", 9L, 60, "EVENT-1");
    }

    private ShopPointTransfer pendingTransfer()
    {
        ShopPointTransfer transfer = new ShopPointTransfer();
        transfer.setRequestNo("PT-1");
        transfer.setShopUserId(9L);
        transfer.setSourceSystem("EVENT");
        transfer.setPhone("13800138000");
        transfer.setPoints(60L);
        transfer.setStatus("PENDING");
        return transfer;
    }
}
