package com.ruoyi.shop.qualification;

import java.io.Serializable;

public class LicenseVerifyResult implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** OCR 是否识别出可用的企业字段。 */
    private boolean recognized;

    private String creditCode;
    private String companyName;
    private String businessAddress;
    private String legalPerson;

    /** 营业执照三要素核验是否通过。 */
    private boolean verified;

    /** 面向申请人的中文说明。 */
    private String verifyMessage;

    public boolean isRecognized() { return recognized; }
    public void setRecognized(boolean recognized) { this.recognized = recognized; }
    public String getCreditCode() { return creditCode; }
    public void setCreditCode(String creditCode) { this.creditCode = creditCode; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getBusinessAddress() { return businessAddress; }
    public void setBusinessAddress(String businessAddress) { this.businessAddress = businessAddress; }
    public String getLegalPerson() { return legalPerson; }
    public void setLegalPerson(String legalPerson) { this.legalPerson = legalPerson; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public String getVerifyMessage() { return verifyMessage; }
    public void setVerifyMessage(String verifyMessage) { this.verifyMessage = verifyMessage; }
}
