package com.ruoyi.shop.domain.vo;

import java.util.Locale;
import com.ruoyi.shop.domain.ShopUser;

public class ShopUserProfile
{
    private Long id;
    private String username;
    private String name;
    private String avatarType;
    private String avatarImage;
    private String role;
    private String roleName;
    private int reportCount;
    private int usefulCount;
    private boolean reviewEligible;
    private boolean trialEligible;
    private boolean phoneBound;
    private String phoneMasked;
    private boolean passwordInitialized;
    private boolean usernameInitialized;

    public static ShopUserProfile from(ShopUser user)
    {
        ShopUserProfile profile = new ShopUserProfile();
        profile.id = user.getUserId();
        profile.username = user.getUserName();
        profile.name = user.getNickName();
        profile.avatarImage = user.getAvatar() == null ? "" : user.getAvatar();
        profile.avatarType = profile.avatarImage.isBlank() ? "letter" : "image";
        profile.role = user.getLevelCode() == null ? "zhenke" : user.getLevelCode().toLowerCase(Locale.ROOT);
        profile.roleName = user.getLevelName();
        profile.reviewEligible = "0".equals(user.getReviewEligible());
        profile.trialEligible = "0".equals(user.getTrialEligible());
        profile.phoneBound = user.getPhoneVerifiedAt() != null && user.getPhonenumber() != null
                && !user.getPhonenumber().isBlank();
        profile.phoneMasked = maskPhone(user.getPhonenumber());
        profile.passwordInitialized = "1".equals(user.getPasswordInitialized());
        profile.usernameInitialized = "1".equals(user.getUsernameInitialized());
        return profile;
    }

    private static String maskPhone(String phone)
    {
        if (phone == null || phone.length() != 11) return "";
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getName() { return name; }
    public String getAvatarType() { return avatarType; }
    public String getAvatarImage() { return avatarImage; }
    public String getRole() { return role; }
    public String getRoleName() { return roleName; }
    public int getReportCount() { return reportCount; }
    public void setReportCount(int reportCount) { this.reportCount = reportCount; }
    public int getUsefulCount() { return usefulCount; }
    public void setUsefulCount(int usefulCount) { this.usefulCount = usefulCount; }
    public boolean isReviewEligible() { return reviewEligible; }
    public boolean isTrialEligible() { return trialEligible; }
    public boolean isPhoneBound() { return phoneBound; }
    public String getPhoneMasked() { return phoneMasked; }
    public boolean isPasswordInitialized() { return passwordInitialized; }
    public boolean isUsernameInitialized() { return usernameInitialized; }
}
