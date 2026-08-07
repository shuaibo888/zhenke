package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ShopMerchantLicenseVerifyBody
{
    @NotBlank(message = "请先上传营业执照")
    private String url;

    @NotBlank(message = "请输入统一社会信用代码")
    @Pattern(regexp = "^[0-9A-Za-z]{18}$", message = "统一社会信用代码必须为18位字母或数字")
    private String creditCode;

    @NotBlank(message = "请输入公司名称")
    private String companyName;

    @NotBlank(message = "请输入法定代表人")
    private String legalPerson;

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getCreditCode() { return creditCode; }
    public void setCreditCode(String creditCode) { this.creditCode = creditCode; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getLegalPerson() { return legalPerson; }
    public void setLegalPerson(String legalPerson) { this.legalPerson = legalPerson; }
}
