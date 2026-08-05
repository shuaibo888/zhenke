package com.ruoyi.shop.domain.dto;

import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopProductCertificationSubmitBody
{
    @NotBlank(message = "请选择商品来源")
    private String sourceType;
    @NotBlank(message = "请填写供货方名称")
    @Size(max = 128, message = "供货方名称不能超过128个字符")
    private String supplierName;
    @NotBlank(message = "请填写商品产地")
    @Size(max = 128, message = "商品产地不能超过128个字符")
    private String originPlace;
    @NotBlank(message = "请填写实际发货地")
    @Size(max = 128, message = "实际发货地不能超过128个字符")
    private String shippingPlace;
    @NotBlank(message = "请选择平台如何核对这个商品")
    private String matchType;
    @NotBlank(message = "请填写材料上用于核对商品的内容")
    @Size(max = 128, message = "用于核对商品的内容不能超过128个字符")
    private String matchValue;
    @NotBlank(message = "请选择供货证明类型")
    private String proofType;
    @AssertTrue(message = "请确认信息和材料真实有效并同意平台处理")
    private Boolean declarationConfirmed;
    private Long retainedProofMaterialId;
    private Long retainedFrontMaterialId;
    private Long retainedLabelMaterialId;
    private MultipartFile proofFile;
    private MultipartFile frontPhoto;
    private MultipartFile labelPhoto;

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getOriginPlace() { return originPlace; }
    public void setOriginPlace(String originPlace) { this.originPlace = originPlace; }
    public String getShippingPlace() { return shippingPlace; }
    public void setShippingPlace(String shippingPlace) { this.shippingPlace = shippingPlace; }
    public String getMatchType() { return matchType; }
    public void setMatchType(String matchType) { this.matchType = matchType; }
    public String getMatchValue() { return matchValue; }
    public void setMatchValue(String matchValue) { this.matchValue = matchValue; }
    public String getProofType() { return proofType; }
    public void setProofType(String proofType) { this.proofType = proofType; }
    public Boolean getDeclarationConfirmed() { return declarationConfirmed; }
    public void setDeclarationConfirmed(Boolean declarationConfirmed) { this.declarationConfirmed = declarationConfirmed; }
    public Long getRetainedProofMaterialId() { return retainedProofMaterialId; }
    public void setRetainedProofMaterialId(Long retainedProofMaterialId) { this.retainedProofMaterialId = retainedProofMaterialId; }
    public Long getRetainedFrontMaterialId() { return retainedFrontMaterialId; }
    public void setRetainedFrontMaterialId(Long retainedFrontMaterialId) { this.retainedFrontMaterialId = retainedFrontMaterialId; }
    public Long getRetainedLabelMaterialId() { return retainedLabelMaterialId; }
    public void setRetainedLabelMaterialId(Long retainedLabelMaterialId) { this.retainedLabelMaterialId = retainedLabelMaterialId; }
    public MultipartFile getProofFile() { return proofFile; }
    public void setProofFile(MultipartFile proofFile) { this.proofFile = proofFile; }
    public MultipartFile getFrontPhoto() { return frontPhoto; }
    public void setFrontPhoto(MultipartFile frontPhoto) { this.frontPhoto = frontPhoto; }
    public MultipartFile getLabelPhoto() { return labelPhoto; }
    public void setLabelPhoto(MultipartFile labelPhoto) { this.labelPhoto = labelPhoto; }
}
