package com.ruoyi.shop.service;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.constant.Constants;
import com.ruoyi.common.constant.CacheConstants;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.exception.user.CaptchaException;
import com.ruoyi.common.exception.user.CaptchaExpireException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.common.utils.ip.IpUtils;
import com.ruoyi.framework.manager.AsyncManager;
import com.ruoyi.framework.manager.factory.AsyncFactory;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.shop.domain.ShopUser;
import com.ruoyi.shop.domain.ShopMemberLevel;
import com.ruoyi.shop.domain.dto.ShopLoginBody;
import com.ruoyi.shop.domain.dto.ShopPasswordBody;
import com.ruoyi.shop.domain.dto.ShopProfileBody;
import com.ruoyi.shop.domain.dto.ShopRegisterBody;
import com.ruoyi.shop.domain.vo.ShopUserProfile;
import com.ruoyi.shop.mapper.ShopUserMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.system.service.ISysConfigService;

@Service
public class ShopAccountService
{
    private final ShopUserMapper userMapper;
    private final TokenService tokenService;
    private final RedisCache redisCache;
    private final ISysConfigService configService;

    public ShopAccountService(ShopUserMapper userMapper, TokenService tokenService, RedisCache redisCache,
            ISysConfigService configService)
    {
        this.userMapper = userMapper;
        this.tokenService = tokenService;
        this.redisCache = redisCache;
        this.configService = configService;
    }

    @Transactional
    public void register(ShopRegisterBody body)
    {
        String username = body.getUsername().trim();
        if (userMapper.countByUsername(username) > 0)
        {
            throw new ServiceException("用户名已存在");
        }
        ShopUser user = new ShopUser();
        user.setUserName(username);
        user.setNickName(username);
        user.setPassword(SecurityUtils.encryptPassword(body.getPassword()));
        user.setLevelId(1L);
        user.setReviewEligible("0");
        user.setTrialEligible("0");
        user.setStatus("0");
        user.setDelFlag("0");
        user.setCreateBy(username);
        userMapper.insert(user);
        recordLogin(username, Constants.REGISTER, "商城用户注册成功");
    }

    public LoginResult login(ShopLoginBody body)
    {
        String username = body.getUsername().trim();
        validateCaptcha(body.getCode(), body.getUuid());
        ShopUser user = userMapper.selectByUsername(username);
        if (user == null || !SecurityUtils.matchesPassword(body.getPassword(), user.getPassword()))
        {
            recordLogin(username, Constants.LOGIN_FAIL, "用户名或密码错误");
            throw new ServiceException("用户名或密码错误");
        }
        if (!"0".equals(user.getStatus()))
        {
            recordLogin(username, Constants.LOGIN_FAIL, "账号已停用");
            throw new ServiceException("账号已停用，请联系管理员");
        }

        userMapper.updateLoginInfo(user.getUserId(), IpUtils.getIpAddr());
        String token = tokenService.createToken(createLoginUser(user));
        recordLogin(username, Constants.LOGIN_SUCCESS, "商城用户登录成功");
        return new LoginResult(token, ShopUserProfile.from(user));
    }

    private void validateCaptcha(String code, String uuid)
    {
        if (!configService.selectCaptchaEnabled())
        {
            return;
        }

        String verifyKey = CacheConstants.CAPTCHA_CODE_KEY + StringUtils.nvl(uuid, "");
        String captcha = redisCache.getCacheObject(verifyKey);
        if (captcha == null)
        {
            throw new CaptchaExpireException();
        }
        redisCache.deleteObject(verifyKey);
        if (!captcha.equalsIgnoreCase(StringUtils.nvl(code, "")))
        {
            throw new CaptchaException();
        }
    }

    public ShopUserProfile currentProfile()
    {
        return ShopUserProfile.from(requireUser(ShopAccountIdentity.requireShopUserId()));
    }

    public List<ShopUser> selectAdminUsers(ShopUser query)
    {
        return userMapper.selectAdminList(query);
    }

    public List<ShopMemberLevel> selectEnabledLevels()
    {
        return userMapper.selectEnabledLevels();
    }

    @Transactional
    public int updateStatus(long userId, String status, String operator)
    {
        requireUser(userId);
        int rows = userMapper.updateStatus(userId, status, operator);
        if (rows > 0 && "1".equals(status))
        {
            invalidateSessions(userId);
        }
        return rows;
    }

    @Transactional
    public int updateLevel(long userId, long levelId, String operator)
    {
        requireUser(userId);
        if (userMapper.countEnabledLevelById(levelId) == 0)
        {
            throw new ServiceException("会员等级不存在或已停用");
        }
        return userMapper.updateLevel(userId, levelId, operator);
    }

    @Transactional
    public ShopUserProfile updateProfile(ShopProfileBody body)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        if (body.getNickname() == null && body.getAvatar() == null)
        {
            throw new ServiceException("没有需要更新的资料");
        }
        ShopUser changes = new ShopUser();
        changes.setUserId(userId);
        if (body.getNickname() != null)
        {
            String nickname = body.getNickname().trim();
            if (StringUtils.isEmpty(nickname))
            {
                throw new ServiceException("昵称不能为空");
            }
            changes.setNickName(nickname);
        }
        changes.setAvatar(body.getAvatar());
        userMapper.updateProfile(changes);

        ShopUser updated = requireUser(userId);
        refreshLoginUser(updated);
        return ShopUserProfile.from(updated);
    }

    @Transactional
    public void updatePassword(ShopPasswordBody body)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopUser user = requireUser(userId);
        if (!SecurityUtils.matchesPassword(body.getOldPassword(), user.getPassword()))
        {
            throw new ServiceException("原密码不正确");
        }
        if (SecurityUtils.matchesPassword(body.getNewPassword(), user.getPassword()))
        {
            throw new ServiceException("新密码不能与原密码相同");
        }
        String encodedPassword = SecurityUtils.encryptPassword(body.getNewPassword());
        userMapper.updatePassword(userId, encodedPassword);
        user.setPassword(encodedPassword);
        refreshLoginUser(user);
    }

    private ShopUser requireUser(long userId)
    {
        ShopUser user = userMapper.selectById(userId);
        if (user == null)
        {
            throw new ServiceException("商城用户不存在");
        }
        return user;
    }

    private LoginUser createLoginUser(ShopUser shopUser)
    {
        long principalId = ShopAccountIdentity.toPrincipalId(shopUser.getUserId());
        SysUser sysUser = new SysUser();
        sysUser.setUserId(principalId);
        sysUser.setUserName(shopUser.getUserName());
        sysUser.setNickName(shopUser.getNickName());
        sysUser.setPassword(shopUser.getPassword());
        sysUser.setAvatar(shopUser.getAvatar());
        sysUser.setStatus(shopUser.getStatus());
        sysUser.setDelFlag(shopUser.getDelFlag());
        sysUser.setRoles(Collections.emptyList());
        return new LoginUser(principalId, null, sysUser, Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
    }

    private void refreshLoginUser(ShopUser user)
    {
        LoginUser current = SecurityUtils.getLoginUser();
        LoginUser refreshed = createLoginUser(user);
        current.setUser(refreshed.getUser());
        current.setPermissions(refreshed.getPermissions());
        tokenService.setLoginUser(current);
    }

    private void invalidateSessions(long shopUserId)
    {
        Collection<String> keys = redisCache.keys(CacheConstants.LOGIN_TOKEN_KEY + "*");
        if (keys == null || keys.isEmpty())
        {
            return;
        }
        long principalId = ShopAccountIdentity.toPrincipalId(shopUserId);
        for (String key : keys)
        {
            LoginUser loginUser = redisCache.getCacheObject(key);
            if (loginUser != null && Long.valueOf(principalId).equals(loginUser.getUserId()))
            {
                redisCache.deleteObject(key);
            }
        }
    }

    private void recordLogin(String username, String status, String message)
    {
        AsyncManager.me().execute(AsyncFactory.recordLogininfor(username, status, message));
    }

    public record LoginResult(String token, ShopUserProfile user) { }
}
