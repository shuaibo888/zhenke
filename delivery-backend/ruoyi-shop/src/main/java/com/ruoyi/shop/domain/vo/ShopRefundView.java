package com.ruoyi.shop.domain.vo;
import java.util.Date;
import com.ruoyi.shop.domain.ShopOrderRefund;
/** Public after-sale history; payment-channel internals are intentionally excluded. */
public record ShopRefundView(Long refundId, String refundType, String refundStatus, String refundReason,
        String auditRemark, Date requestTime, Date auditTime, Date refundTime,
        String returnRecipient, String returnPhone, String returnAddress, String returnTrackingNo,
        Date returnShipTime, Date returnReceiveTime) {
    public static ShopRefundView from(ShopOrderRefund r) {
        return new ShopRefundView(r.getRefundId(), r.getRefundType(), r.getRefundStatus(), r.getRefundReason(),
                r.getAuditRemark(), r.getRequestTime(), r.getAuditTime(), r.getRefundTime(),
                r.getReturnRecipient(), r.getReturnPhone(), r.getReturnAddress(), r.getReturnTrackingNo(),
                r.getReturnShipTime(), r.getReturnReceiveTime());
    }
}
