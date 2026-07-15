package com.ruoyi.shop.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ruoyi.common.core.domain.BaseEntity;

public class ShopUser extends BaseEntity
{
    private static final long serialVersionUID = 1L;
    private Long userId;
    private String userName;
    private String nickName;
    private String password;
    private String phonenumber;
    private String email;
    private String avatar;
    private Long levelId;
    private String levelCode;
    private String levelName;
    private String reviewEligible;
    private String trialEligible;
    private String status;
    private String delFlag;
    private String loginIp;
    private Date loginDate;
    private Date pwdUpdateDate;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getNickName() { return nickName; }
    public void setNickName(String nickName) { this.nickName = nickName; }
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPhonenumber() { return phonenumber; }
    public void setPhonenumber(String phonenumber) { this.phonenumber = phonenumber; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public Long getLevelId() { return levelId; }
    public void setLevelId(Long levelId) { this.levelId = levelId; }
    public String getLevelCode() { return levelCode; }
    public void setLevelCode(String levelCode) { this.levelCode = levelCode; }
    public String getLevelName() { return levelName; }
    public void setLevelName(String levelName) { this.levelName = levelName; }
    public String getReviewEligible() { return reviewEligible; }
    public void setReviewEligible(String reviewEligible) { this.reviewEligible = reviewEligible; }
    public String getTrialEligible() { return trialEligible; }
    public void setTrialEligible(String trialEligible) { this.trialEligible = trialEligible; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
    public String getLoginIp() { return loginIp; }
    public void setLoginIp(String loginIp) { this.loginIp = loginIp; }
    public Date getLoginDate() { return loginDate; }
    public void setLoginDate(Date loginDate) { this.loginDate = loginDate; }
    public Date getPwdUpdateDate() { return pwdUpdateDate; }
    public void setPwdUpdateDate(Date pwdUpdateDate) { this.pwdUpdateDate = pwdUpdateDate; }
}
