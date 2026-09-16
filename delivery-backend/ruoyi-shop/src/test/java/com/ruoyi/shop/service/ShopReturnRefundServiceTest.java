package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Set;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.*;
import com.ruoyi.shop.domain.dto.*;
import com.ruoyi.shop.domain.vo.ShopRefundView;
import com.ruoyi.shop.logistics.AliyunLogisticsService;
import com.ruoyi.shop.mapper.ShopCartMapper;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopReturnRefundServiceTest {
    private final ShopOrderMapper mapper = mock(ShopOrderMapper.class);
    private final ShopMerchantService merchants = mock(ShopMerchantService.class);
    private final AliyunLogisticsService logistics = mock(AliyunLogisticsService.class);
    private final ShopOrderService users = new ShopOrderService(mapper, mock(ShopCartMapper.class), logistics, mock(ShopCouponService.class));
    private final ShopMerchantOrderService merchant = new ShopMerchantOrderService(mapper, merchants, logistics);
    private ShopOrder order;
    private ShopOrderRefund refund;

    @BeforeEach void setup() {
        SysUser user = new SysUser(); user.setPhonenumber("13800000000");
        LoginUser principal = new LoginUser(ShopAccountIdentity.toPrincipalId(5), null, user, Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        ShopMerchant shop = new ShopMerchant(); shop.setMerchantId(7L); shop.setAdminUserId(17L);
        when(merchants.currentMerchantAccount()).thenReturn(shop);
        order = new ShopOrder(); order.setOrderId(31L); order.setOrderNo("test31"); order.setUserId(5L);
        order.setMerchantId(7L); order.setFulfillmentType("ONLINE"); order.setStatus("RECEIVED"); order.setPaymentChannel("WECHAT");
        when(mapper.selectUserOrderForUpdate(5L, 31L)).thenReturn(order);
        when(mapper.selectUserOrder(5L, 31L)).thenReturn(order);
        when(mapper.selectMerchantOrderForUpdate(7L, 31L)).thenReturn(order);
        when(mapper.selectMerchantOrder(7L, 31L)).thenReturn(order);
        refund = new ShopOrderRefund(); refund.setRefundId(10L); refund.setOrderId(31L);
        refund.setUserId(5L); refund.setMerchantId(7L); refund.setRefundType("RETURN_REFUND");
        refund.setRefundStatus("PENDING"); refund.setReviewRequired("1");
        when(mapper.selectLatestRefund(31L)).thenReturn(refund);
        when(mapper.selectRefundHistory(31L)).thenReturn(List.of(refund));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    private ShopOrderRefundBody application(String type) {
        ShopOrderRefundBody body = new ShopOrderRefundBody(); body.setRefundType(type); body.setReason("商品不合适"); return body;
    }
    private ShopOrderRefundAuditBody approval() {
        ShopOrderRefundAuditBody body = new ShopOrderRefundAuditBody(); body.setRefundId(10L); body.setDecision("APPROVED");
        body.setReturnRecipient("测试收件人"); body.setReturnPhone("13800000000"); body.setReturnAddress("测试省测试市测试街道1号"); return body;
    }
    private ShopOrderShipBody shipment() {
        ShopOrderShipBody body = new ShopOrderShipBody(); body.setTrackingNo(" SF123456 "); return body;
    }

    @ParameterizedTest @ValueSource(strings = {"REFUND_ONLY", "RETURN_REFUND"})
    void shippedOrdersCannotRequestEitherType(String type) {
        order.setStatus("SHIPPED"); when(mapper.selectLatestRefund(31L)).thenReturn(null);
        assertThrows(ServiceException.class, () -> users.requestRefund(31, application(type)));
        verify(mapper, never()).insertRefund(any());
    }
    @ParameterizedTest @ValueSource(strings = {"REFUND_ONLY", "RETURN_REFUND"})
    void rejectionAllowsNewIndependentApplicationOfEitherType(String type) {
        refund.setRefundStatus("REJECTED"); refund.setAuditRemark("请改为退货退款");
        when(mapper.insertRefund(any())).thenReturn(1);
        users.requestRefund(31, application(type));
        ArgumentCaptor<ShopOrderRefund> created = ArgumentCaptor.forClass(ShopOrderRefund.class);
        verify(mapper).insertRefund(created.capture());
        assertEquals(type, created.getValue().getRefundType());
        assertEquals("PENDING", created.getValue().getRefundStatus());
        assertEquals("1", created.getValue().getReviewRequired());
        assertNull(created.getValue().getRefundId());
        assertEquals("请改为退货退款", refund.getAuditRemark());
        assertEquals("REJECTED", refund.getRefundStatus());
    }
    @ParameterizedTest @ValueSource(strings = {"PENDING", "WAITING_RETURN", "RETURN_SHIPPED", "REFUNDING", "REFUNDED"})
    void activeOrCompletedApplicationPreventsDuplicates(String status) {
        refund.setRefundStatus(status);
        assertThrows(ServiceException.class, () -> users.requestRefund(31, application("REFUND_ONLY")));
        verify(mapper, never()).insertRefund(any());
    }
    @Test void unshippedRefundKeepsExistingImmediateFlow() {
        order.setStatus("PAID"); when(mapper.selectLatestRefund(31L)).thenReturn(null);
        when(mapper.updateStatus(5L, 31L, "PAID", "REFUNDING")).thenReturn(1);
        when(mapper.insertRefund(any())).thenReturn(1); when(mapper.insertStatusLog(any())).thenReturn(1);
        users.requestRefund(31, application("REFUND_ONLY"));
        verify(mapper).insertRefund(argThat(r -> "REFUNDING".equals(r.getRefundStatus()) && "0".equals(r.getReviewRequired())));
    }
    @Test void offlineOrderCannotRequestReturn() {
        order.setFulfillmentType("OFFLINE"); when(mapper.selectLatestRefund(31L)).thenReturn(null);
        assertThrows(ServiceException.class, () -> users.requestRefund(31, application("RETURN_REFUND")));
    }
    @Test void returnApprovalStoresAddressWithoutMovingOrderToRefunding() {
        when(mapper.updateRefundAudit(10L, 7L, "PENDING", "WAITING_RETURN", 17L, "")).thenReturn(1);
        when(mapper.setReturnAddress(eq(10L), eq(7L), anyString(), anyString(), anyString())).thenReturn(1);
        merchant.auditRefund(31, approval());
        verify(mapper).setReturnAddress(10L, 7L, "测试收件人", "13800000000", "测试省测试市测试街道1号");
        verify(mapper, never()).updateStatus(anyLong(), anyLong(), anyString(), anyString());
    }
    @Test void refundOnlyApprovalStillInitiatesRefund() {
        refund.setRefundType("REFUND_ONLY");
        when(mapper.updateRefundAudit(10L, 7L, "PENDING", "REFUNDING", 17L, "")).thenReturn(1);
        when(mapper.updateStatus(5L, 31L, "RECEIVED", "REFUNDING")).thenReturn(1);
        when(mapper.insertStatusLog(any())).thenReturn(1);
        merchant.auditRefund(31, approval());
        verify(mapper).updateStatus(5L, 31L, "RECEIVED", "REFUNDING");
        verify(mapper, never()).setReturnAddress(anyLong(), anyLong(), anyString(), anyString(), anyString());
    }
    @Test void returnApprovalRequiresCompleteAddress() {
        ShopOrderRefundAuditBody body = approval(); body.setReturnAddress(" ");
        assertThrows(ServiceException.class, () -> merchant.auditRefund(31, body));
        verify(mapper, never()).updateRefundAudit(anyLong(), anyLong(), anyString(), anyString(), anyLong(), any());
    }
    @Test void staleAuditDoesNotApproveTheNextApplication() {
        ShopOrderRefundAuditBody body = approval(); body.setRefundId(9L);
        assertThrows(ServiceException.class, () -> merchant.auditRefund(31, body));
    }
    @Test void rejectionRequiresReasonAndPersistsIt() {
        ShopOrderRefundAuditBody body = approval(); body.setDecision("REJECTED");
        assertThrows(ServiceException.class, () -> merchant.auditRefund(31, body));
        body.setAuditRemark("请先说明退货原因");
        when(mapper.updateRefundAudit(10L, 7L, "PENDING", "REJECTED", 17L, "请先说明退货原因")).thenReturn(1);
        merchant.auditRefund(31, body);
        verify(mapper).updateRefundAudit(10L, 7L, "PENDING", "REJECTED", 17L, "请先说明退货原因");
    }
    @Test void returnShipmentRequiresApprovalAndMatchingApplication() {
        assertThrows(ServiceException.class, () -> users.shipReturn(31, 10, shipment()));
        refund.setRefundStatus("WAITING_RETURN");
        assertThrows(ServiceException.class, () -> users.shipReturn(31, 9, shipment()));
        when(mapper.shipReturn(10L, 5L, "SF123456")).thenReturn(1);
        users.shipReturn(31, 10, shipment());
        verify(mapper).shipReturn(10L, 5L, "SF123456");
        verify(mapper, never()).updateStatus(anyLong(), anyLong(), anyString(), anyString());
    }
    @Test void merchantReceiptIsRequiredBeforeReturnRefund() {
        assertThrows(ServiceException.class, () -> merchant.confirmReturn(31, 10));
        refund.setRefundStatus("RETURN_SHIPPED");
        when(mapper.receiveReturn(10L, 7L)).thenReturn(1);
        when(mapper.updateStatus(5L, 31L, "RECEIVED", "REFUNDING")).thenReturn(1);
        when(mapper.insertStatusLog(any())).thenReturn(1);
        merchant.confirmReturn(31, 10);
        verify(mapper).receiveReturn(10L, 7L);
        verify(mapper).updateStatus(5L, 31L, "RECEIVED", "REFUNDING");
        refund.setRefundStatus("REFUNDING");
        assertThrows(ServiceException.class, () -> merchant.confirmReturn(31, 10));
    }
    @Test void failedCompareAndSetDoesNotAdvanceOrder() {
        refund.setRefundStatus("RETURN_SHIPPED");
        when(mapper.receiveReturn(10L, 7L)).thenReturn(0);
        assertThrows(ServiceException.class, () -> merchant.confirmReturn(31, 10));
        verify(mapper, never()).updateStatus(anyLong(), anyLong(), anyString(), anyString());
    }
    @Test void otherUsersAndMerchantsCannotAccessReturns() {
        when(mapper.selectUserOrderForUpdate(5L, 31L)).thenReturn(null);
        assertThrows(ServiceException.class, () -> users.shipReturn(31, 10, shipment()));
        when(mapper.selectMerchantOrderForUpdate(7L, 31L)).thenReturn(null);
        assertThrows(ServiceException.class, () -> merchant.confirmReturn(31, 10));
    }
    @Test void returnTrackingUsesExistingAutomaticCarrierLookupAndHistoryIsPreserved() {
        refund.setRefundStatus("REJECTED"); refund.setAuditRemark("原因保留"); refund.setReturnTrackingNo("SF123456");
        users.returnLogistics(31, 10);
        verify(logistics).query(null, "SF123456", List.of());
        ShopRefundView view = users.myOrder(31).getRefundHistory().get(0);
        assertEquals("原因保留", view.auditRemark());
        assertEquals(10L, view.refundId());
    }
}
