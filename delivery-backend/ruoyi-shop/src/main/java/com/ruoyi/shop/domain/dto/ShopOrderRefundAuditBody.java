package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopOrderRefundAuditBody
{
    @NotBlank(message = "审核结果不能为空")
    @Pattern(regexp = "APPROVED|REJECTED", message = "审核结果无效")
    private String decision;

    @Size(max = 500, message = "审核说明最多500个字符")
    private String auditRemark;

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }
}
