package com.ruoyi.shop.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.shop.domain.ShopMemberLevel;
import com.ruoyi.shop.domain.ShopUser;

public interface ShopUserMapper
{
    ShopUser selectById(Long userId);
    ShopUser selectByUsername(String username);
    int countByUsername(String username);
    int insert(ShopUser user);
    int updateLoginInfo(@Param("userId") Long userId, @Param("loginIp") String loginIp);
    int updateProfile(ShopUser user);
    int updatePassword(@Param("userId") Long userId, @Param("password") String password);
    List<ShopUser> selectAdminList(ShopUser query);
    List<ShopMemberLevel> selectEnabledLevels();
    int countEnabledLevelById(Long levelId);
    int updateStatus(@Param("userId") Long userId, @Param("status") String status, @Param("updateBy") String updateBy);
    int updateLevel(@Param("userId") Long userId, @Param("levelId") Long levelId, @Param("updateBy") String updateBy);
}
