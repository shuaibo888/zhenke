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
        return profile;
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
}
