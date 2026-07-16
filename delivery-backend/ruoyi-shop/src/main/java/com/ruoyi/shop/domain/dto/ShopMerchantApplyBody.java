package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopMerchantApplyBody
{
    @NotBlank(message = "请输入商家后台账号")
    @Pattern(regexp = "^[A-Za-z0-9_]{4,30}$", message = "商家后台账号必须为4到30位字母、数字或下划线")
    private String accountUsername;

    @NotBlank(message = "请输入商家后台密码")
    @Size(min = 6, max = 50, message = "商家后台密码必须为6到50位")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "商家后台密码必须同时包含字母和数字")
    private String password;

    private String code;
    private String uuid;
    private String applicationNo;
    private String queryToken;

    @NotBlank(message = "请输入公司名称")
    @Size(max = 100, message = "公司名称不能超过100个字符")
    private String companyName;

    @NotBlank(message = "请输入公司地址")
    @Size(max = 255, message = "公司地址不能超过255个字符")
    private String companyAddress;

    @NotBlank(message = "请输入联系人")
    @Size(max = 30, message = "联系人不能超过30个字符")
    private String contactName;

    @NotBlank(message = "请输入联系电话")
    @Pattern(regexp = "^[0-9+\\- ]{6,20}$", message = "联系电话格式不正确")
    private String contactPhone;

    @NotBlank(message = "请输入营业执照图片或资源地址")
    @Size(max = 500, message = "营业执照地址不能超过500个字符")
    private String businessLicense;

    @NotBlank(message = "请输入产品介绍")
    @Size(max = 2000, message = "产品介绍不能超过2000个字符")
    private String productIntro;

    @NotBlank(message = "请输入产地溯源信息")
    @Size(max = 2000, message = "产地溯源不能超过2000个字符")
    private String originTraceability;

    @NotNull(message = "请确认验证招募承诺")
    @AssertTrue(message = "必须承诺发起验证招募")
    private Boolean acceptsVerificationRecruitment;

    @NotNull(message = "请确认公益分成约定")
    @AssertTrue(message = "必须接受公益分成约定")
    private Boolean acceptsPublicWelfare;

    @NotNull(message = "请阅读并同意商家入驻协议")
    @AssertTrue(message = "必须同意商家入驻协议")
    private Boolean protocolAgreed;

    public String getAccountUsername() { return accountUsername; }
    public void setAccountUsername(String accountUsername) { this.accountUsername = accountUsername; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getUuid() { return uuid; }
    public void setUuid(String uuid) { this.uuid = uuid; }
    public String getApplicationNo() { return applicationNo; }
    public void setApplicationNo(String applicationNo) { this.applicationNo = applicationNo; }
    public String getQueryToken() { return queryToken; }
    public void setQueryToken(String queryToken) { this.queryToken = queryToken; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getCompanyAddress() { return companyAddress; }
    public void setCompanyAddress(String companyAddress) { this.companyAddress = companyAddress; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getBusinessLicense() { return businessLicense; }
    public void setBusinessLicense(String businessLicense) { this.businessLicense = businessLicense; }
    public String getProductIntro() { return productIntro; }
    public void setProductIntro(String productIntro) { this.productIntro = productIntro; }
    public String getOriginTraceability() { return originTraceability; }
    public void setOriginTraceability(String originTraceability) { this.originTraceability = originTraceability; }
    public Boolean getAcceptsVerificationRecruitment() { return acceptsVerificationRecruitment; }
    public void setAcceptsVerificationRecruitment(Boolean value) { this.acceptsVerificationRecruitment = value; }
    public Boolean getAcceptsPublicWelfare() { return acceptsPublicWelfare; }
    public void setAcceptsPublicWelfare(Boolean acceptsPublicWelfare) { this.acceptsPublicWelfare = acceptsPublicWelfare; }
    public Boolean getProtocolAgreed() { return protocolAgreed; }
    public void setProtocolAgreed(Boolean protocolAgreed) { this.protocolAgreed = protocolAgreed; }
}
