package com.ruoyi.shop.service;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.dao.DuplicateKeyException;
import com.ruoyi.common.config.RuoYiConfig;
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
import com.ruoyi.common.utils.file.FileUploadUtils;
import com.ruoyi.common.utils.file.MimeTypeUtils;
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
import com.ruoyi.shop.mapper.ShopPointMapper;
import com.ruoyi.shop.mapper.ShopUserMapper;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.system.service.ISysConfigService;

@Service
public class ShopAccountService
{
    private static final long MAX_AVATAR_SIZE = 5 * 1024 * 1024L;
    private static final String[] AVATAR_EXTENSIONS = { "gif", "jpg", "jpeg", "png" };
    private static final Set<String> AVATAR_CONTENT_TYPES = Set.of(
            MimeTypeUtils.IMAGE_GIF, MimeTypeUtils.IMAGE_JPG, MimeTypeUtils.IMAGE_JPEG, MimeTypeUtils.IMAGE_PNG);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String PHONE_PATTERN = "^1\\d{10}$";

    /** 注册来源：商城自主注册（账号密码、手机号、H5 一键认证直接创建账号）。 */
    public static final String REGISTER_SOURCE_SELF = "SELF";
    /** 注册来源：用户首次通过燃赛单点登录进入商城并因此自动创建账号。 */
    public static final String REGISTER_SOURCE_RANSAI = "RANSAI";

    private final ShopUserMapper userMapper;
    private final ShopPointMapper pointMapper;
    private final ShopTrialMapper trialMapper;
    private final TokenService tokenService;
    private final RedisCache redisCache;
    private final ISysConfigService configService;

    public ShopAccountService(ShopUserMapper userMapper, ShopPointMapper pointMapper,
            ShopTrialMapper trialMapper,
            TokenService tokenService, RedisCache redisCache,
            ISysConfigService configService)
    {
        this.userMapper = userMapper;
        this.pointMapper = pointMapper;
        this.trialMapper = trialMapper;
        this.tokenService = tokenService;
        this.redisCache = redisCache;
        this.configService = configService;
    }

    @Transactional
    public void register(ShopRegisterBody body)
    {
        String username = body.getUsername().trim();
        validateCaptcha(body.getCode(), body.getUuid());
        if (username.matches(PHONE_PATTERN))
        {
            throw new ServiceException("用户名不能使用手机号，请选择手机号注册");
        }
        if (userMapper.countByUsername(username) > 0)
        {
            throw new ServiceException("用户名已存在");
        }
        ShopUser user = new ShopUser();
        user.setUserName(username);
        user.setNickName(username);
        user.setPassword(SecurityUtils.encryptPassword(body.getPassword()));
        user.setUsernameInitialized("1");
        user.setPasswordInitialized("1");
        user.setLevelId(1L);
        user.setReviewEligible("0");
        user.setTrialEligible("0");
        user.setStatus("0");
        user.setRegisterSource(REGISTER_SOURCE_SELF);
        user.setDelFlag("0");
        user.setCreateBy(username);
        if (userMapper.insert(user) <= 0 || user.getUserId() == null)
        {
            throw new ServiceException("商城用户注册失败");
        }
        if (pointMapper.insertDefaultAccount(user.getUserId(), username) <= 0)
        {
            throw new ServiceException("积分账户初始化失败");
        }
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

        return issueLogin(user);
    }

    @Transactional
    public LoginResult loginByVerifiedPhone(String phone)
    {
        return loginByVerifiedPhone(phone, null, REGISTER_SOURCE_SELF);
    }

    @Transactional
    public LoginResult loginBySsoVerifiedPhone(String phone, String nickname)
    {
        return loginByVerifiedPhone(phone, nickname, REGISTER_SOURCE_RANSAI);
    }

    private LoginResult loginByVerifiedPhone(String phone, String nickname, String registerSource)
    {
        String normalizedPhone = StringUtils.trim(phone);
        if (StringUtils.isEmpty(normalizedPhone) || !normalizedPhone.matches(PHONE_PATTERN))
        {
            throw new ServiceException("手机号格式错误");
        }
        ShopUser user = userMapper.selectByPhone(normalizedPhone);
        if (user == null) user = createPhoneUser(normalizedPhone, nickname, registerSource);
        if (!"0".equals(user.getStatus()))
        {
            throw new ServiceException("账号已停用，请重新注册新账号");
        }
        return issueLogin(user);
    }

    private ShopUser createPhoneUser(String phone, String nickname, String registerSource)
    {
        ShopUser user = new ShopUser();
        String generatedUsername = generateRandomUsername();
        user.setUserName(generatedUsername);
        user.setNickName(resolvePhoneUserNickname(phone, nickname));
        byte[] randomPassword = new byte[24];
        RANDOM.nextBytes(randomPassword);
        user.setPassword(SecurityUtils.encryptPassword(HexFormat.of().formatHex(randomPassword)));
        user.setPhonenumber(phone);
        user.setPhoneVerifiedAt(new Date());
        user.setUsernameInitialized("0");
        user.setPasswordInitialized("0");
        user.setLevelId(1L);
        user.setReviewEligible("0");
        user.setTrialEligible("0");
        user.setStatus("0");
        user.setRegisterSource(registerSource);
        user.setDelFlag("0");
        user.setCreateBy("phone-auth");
        try
        {
            if (userMapper.insert(user) <= 0 || user.getUserId() == null)
            {
                throw new ServiceException("手机号账号创建失败");
            }
        }
        catch (DuplicateKeyException exception)
        {
            ShopUser existing = userMapper.selectByPhone(phone);
            if (existing != null) return existing;
            throw new ServiceException("手机号账号创建冲突，请稍后重试");
        }
        if (pointMapper.insertDefaultAccount(user.getUserId(), "phone-auth") <= 0)
        {
            throw new ServiceException("积分账户初始化失败");
        }
        recordLogin(user.getUserName(), Constants.REGISTER, "商城手机号用户自动注册成功");
        return user;
    }

    private String resolvePhoneUserNickname(String phone, String nickname)
    {
        String normalizedNickname = StringUtils.trim(nickname);
        if (StringUtils.isEmpty(normalizedNickname))
        {
            return "用户" + phone.substring(7);
        }
        if (normalizedNickname.length() > 30)
        {
            throw new ServiceException("昵称长度必须在1到30位之间");
        }
        return normalizedNickname;
    }

    private String generateRandomUsername()
    {
        for (int attempt = 0; attempt < 5; attempt++)
        {
            byte[] random = new byte[8];
            RANDOM.nextBytes(random);
            String username = "u_" + HexFormat.of().formatHex(random);
            if (userMapper.countByUsername(username) == 0) return username;
        }
        throw new ServiceException("随机账号生成失败，请稍后重试");
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
        return profileFrom(requireUser(ShopAccountIdentity.requireAuthenticatedShopUserId()));
    }

    public String currentPhone()
    {
        return requireUser(ShopAccountIdentity.requireAuthenticatedShopUserId()).getPhonenumber();
    }

    public void requirePhoneAvailable(String phone)
    {
        if (userMapper.countByPhone(phone) > 0)
        {
            throw new ServiceException("该手机号已绑定其他账号");
        }
    }

    @Transactional
    public ShopUserProfile bindVerifiedPhone(String phone)
    {
        long userId = ShopAccountIdentity.requireAuthenticatedShopUserId();
        ShopUser user = requireUser(userId);
        if (user.getPhoneVerifiedAt() != null && !StringUtils.isEmpty(user.getPhonenumber()))
        {
            throw new ServiceException("当前账号已经绑定手机号");
        }
        requirePhoneAvailable(phone);
        try
        {
            if (userMapper.bindPhone(userId, phone) <= 0)
            {
                throw new ServiceException("手机号绑定失败，请刷新后重试");
            }
        }
        catch (DuplicateKeyException exception)
        {
            throw new ServiceException("该手机号已绑定其他账号");
        }
        ShopUser updated = requireUser(userId);
        refreshLoginUser(updated);
        return profileFrom(updated);
    }

    @Transactional
    public ShopUserProfile changeVerifiedPhone(String newPhone)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopUser user = requireUser(userId);
        String currentPhone = user.getPhonenumber();
        if (newPhone.equals(currentPhone)) throw new ServiceException("新手机号不能与当前手机号相同");
        requirePhoneAvailable(newPhone);
        try
        {
            if (userMapper.changePhone(userId, currentPhone, newPhone) <= 0)
            {
                throw new ServiceException("手机号换绑失败，请刷新后重试");
            }
        }
        catch (DuplicateKeyException exception)
        {
            throw new ServiceException("该手机号已绑定其他账号");
        }
        ShopUser updated = requireUser(userId);
        refreshLoginUser(updated);
        return profileFrom(updated);
    }

    @Transactional
    public ShopUserProfile initializeUsername(String rawUsername)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopUser user = requireUser(userId);
        if ("1".equals(user.getUsernameInitialized()))
        {
            throw new ServiceException("账号名已经确认，不能再次修改");
        }
        String username = rawUsername == null ? "" : rawUsername.trim();
        if (!username.matches("^(?!1\\d{10}$)[A-Za-z0-9_]{4,20}$"))
        {
            throw new ServiceException("账号名只能包含4到20位字母、数字和下划线，且不能使用手机号");
        }
        if (userMapper.countByUsername(username) > 0)
        {
            throw new ServiceException("账号名已存在");
        }
        try
        {
            if (userMapper.initializeUsername(userId, username) <= 0)
            {
                throw new ServiceException("账号名已确认或账号状态已变化，请刷新后重试");
            }
        }
        catch (DuplicateKeyException exception)
        {
            throw new ServiceException("账号名已存在");
        }
        ShopUser updated = requireUser(userId);
        refreshLoginUser(updated);
        return profileFrom(updated);
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
        if (body.getNickname() == null)
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
        userMapper.updateProfile(changes);

        ShopUser updated = requireUser(userId);
        refreshLoginUser(updated);
        return profileFrom(updated);
    }

    @Transactional
    public ShopUserProfile updateAvatar(MultipartFile file)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        requireUser(userId);
        validateAvatar(file);

        try
        {
            String avatar = FileUploadUtils.upload(
                    RuoYiConfig.getAvatarPath(), file, AVATAR_EXTENSIONS, true);
            ShopUser changes = new ShopUser();
            changes.setUserId(userId);
            changes.setAvatar(avatar);
            if (userMapper.updateProfile(changes) <= 0)
            {
                throw new ServiceException("头像更新失败");
            }

            ShopUser updated = requireUser(userId);
            refreshLoginUser(updated);
            return profileFrom(updated);
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            throw new ServiceException("头像上传失败，请重新选择图片");
        }
    }

    private void validateAvatar(MultipartFile file)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("请选择头像图片");
        }
        if (file.getSize() > MAX_AVATAR_SIZE)
        {
            throw new ServiceException("头像图片不能超过 5MB");
        }
        if (!AVATAR_CONTENT_TYPES.contains(file.getContentType()))
        {
            throw new ServiceException("头像仅支持 JPG、PNG、GIF 格式");
        }

        try (InputStream input = file.getInputStream())
        {
            BufferedImage image = ImageIO.read(input);
            if (image == null)
            {
                throw new ServiceException("头像文件不是有效图片");
            }
        }
        catch (IOException exception)
        {
            throw new ServiceException("头像图片读取失败");
        }
    }

    @Transactional
    public void updatePassword(ShopPasswordBody body, boolean phoneVerified)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopUser user = requireUser(userId);
        if (!phoneVerified && (StringUtils.isEmpty(body.getOldPassword())
                || !SecurityUtils.matchesPassword(body.getOldPassword(), user.getPassword())))
        {
            throw new ServiceException("原密码不正确，或请改用手机号短信验证");
        }
        if (SecurityUtils.matchesPassword(body.getNewPassword(), user.getPassword()))
        {
            throw new ServiceException("新密码不能与原密码相同");
        }
        String encodedPassword = SecurityUtils.encryptPassword(body.getNewPassword());
        userMapper.updatePassword(userId, encodedPassword);
        user.setPassword(encodedPassword);
        user.setPasswordInitialized("1");
        refreshLoginUser(user);
    }

    private LoginResult issueLogin(ShopUser user)
    {
        userMapper.updateLoginInfo(user.getUserId(), IpUtils.getIpAddr());
        String token = tokenService.createToken(createLoginUser(user));
        recordLogin(user.getUserName(), Constants.LOGIN_SUCCESS, "商城用户登录成功");
        return new LoginResult(token, profileFrom(user));
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

    private ShopUserProfile profileFrom(ShopUser user)
    {
        ShopUserProfile profile = ShopUserProfile.from(user);
        profile.setReportCount(trialMapper.countPublishedReportsByUser(user.getUserId()));
        profile.setUsefulCount(trialMapper.countUsefulReceivedByUser(user.getUserId()));
        return profile;
    }

    private LoginUser createLoginUser(ShopUser shopUser)
    {
        long principalId = ShopAccountIdentity.toPrincipalId(shopUser.getUserId());
        SysUser sysUser = new SysUser();
        sysUser.setUserId(principalId);
        sysUser.setUserName(shopUser.getUserName());
        sysUser.setNickName(shopUser.getNickName());
        sysUser.setPassword(shopUser.getPassword());
        if (shopUser.getPhoneVerifiedAt() != null)
        {
            sysUser.setPhonenumber(shopUser.getPhonenumber());
        }
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
