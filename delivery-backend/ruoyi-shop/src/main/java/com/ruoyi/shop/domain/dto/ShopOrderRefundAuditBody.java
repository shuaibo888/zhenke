package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopOrderRefundAuditBody
{
    @jakarta.validation.constraints.NotNull(message = "请提供要审核的售后申请编号")
    @jakarta.validation.constraints.Positive(message = "售后申请编号无效")
    private Long refundId;
    public Long getRefundId() { return refundId; }
    public void setRefundId(Long refundId) { this.refundId = refundId; }
    private String returnRecipient;
    public String getReturnRecipient() { return returnRecipient; }
    public void setReturnRecipient(String returnRecipient) { this.returnRecipient = returnRecipient; }
    private String returnPhone;
    public String getReturnPhone() { return returnPhone; }
    public void setReturnPhone(String returnPhone) { this.returnPhone = returnPhone; }
    private String returnAddress;
    public String getReturnAddress() { return returnAddress; }
    public void setReturnAddress(String returnAddress) { this.returnAddress = returnAddress; }

    @NotBlank(message = "退款审核结果不能为空")
    @Pattern(regexp = "APPROVED|REJECTED", message = "退款审核结果无效")
    private String decision;

    @Size(max = 200, message = "审核说明不能超过200个字")
    private String auditRemark;

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }
}
