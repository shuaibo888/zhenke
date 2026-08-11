package com.ruoyi.shop.service;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.config.RuoYiConfig;
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
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopMerchantAuditLog;
import com.ruoyi.shop.domain.dto.ShopMerchantApplyBody;
import com.ruoyi.shop.domain.dto.ShopMerchantAuditBody;
import com.ruoyi.shop.domain.dto.ShopMerchantQueryBody;
import com.ruoyi.shop.domain.vo.ShopMerchantApplyResult;
import com.ruoyi.shop.mapper.ShopMerchantMapper;
import com.ruoyi.shop.qualification.AliyunLicenseService;
import com.ruoyi.shop.qualification.LicenseVerifyResult;
import com.ruoyi.system.service.ISysConfigService;
import com.ruoyi.system.service.ISysUserService;

@Service
public class ShopMerchantService
{
    public static final String PENDING = "PENDING";
    public static final String APPROVED = "APPROVED";
    public static final String REJECTED = "REJECTED";
    private static final String MERCHANT_ROLE_KEY = "merchant";
    private static final long MAX_LICENSE_SIZE = 5 * 1024 * 1024L;
    private static final String[] LICENSE_EXTENSIONS = { "jpg", "jpeg", "png" };
    private static final Set<String> LICENSE_CONTENT_TYPES = Set.of(
            MimeTypeUtils.IMAGE_JPG, MimeTypeUtils.IMAGE_JPEG, MimeTypeUtils.IMAGE_PNG);

    private final ShopMerchantMapper merchantMapper;
    private final ISysUserService sysUserService;
    private final RedisCache redisCache;
    private final ISysConfigService configService;
    private final AliyunLicenseService licenseService;

    public ShopMerchantService(ShopMerchantMapper merchantMapper, ISysUserService sysUserService,
            RedisCache redisCache, ISysConfigService configService, AliyunLicenseService licenseService)
    {
        this.merchantMapper = merchantMapper;
        this.sysUserService = sysUserService;
        this.redisCache = redisCache;
        this.configService = configService;
        this.licenseService = licenseService;
    }

    public ShopMerchant applicationStatus(ShopMerchantQueryBody body)
    {
        ShopMerchant merchant = merchantMapper.selectByContactPhone(StringUtils.trim(body.getContactPhone()));
        if (merchant == null)
        {
            throw new ServiceException("该手机号暂无商家入驻申请");
        }
        return withAuditLogs(merchant);
    }

    public String uploadBusinessLicense(MultipartFile file, String code, String uuid)
    {
        validateCaptcha(code, uuid);
        validateBusinessLicense(file);
        try
        {
            return FileUploadUtils.upload(
                    RuoYiConfig.getUploadPath() + "/merchant-license",
                    file,
                    LICENSE_EXTENSIONS,
                    true);
        }
        catch (Exception exception)
        {
            throw new ServiceException("营业执照上传失败，请重新选择图片");
        }
    }

    @Transactional
    public ShopMerchantApplyResult apply(ShopMerchantApplyBody body)
    {
        String accountUsername = normalizeAccountUsername(body.getAccountUsername());
        validateInitialPassword(body.getPassword());
        String contactPhone = StringUtils.trim(body.getContactPhone());

        ShopMerchant existing = merchantMapper.selectByContactPhone(contactPhone);
        if (existing != null && !REJECTED.equals(existing.getAuditStatus()))
        {
            throw new ServiceException("该手机号已提交过商家入驻申请，请查询申请进度");
        }

        ShopMerchant usernameOwner = merchantMapper.selectByAccountUsername(accountUsername);
        if (sysUserService.selectUserByUserName(accountUsername) != null
                || (usernameOwner != null && (existing == null
                        || !usernameOwner.getMerchantId().equals(existing.getMerchantId()))))
        {
            throw new ServiceException("商家后台账号已存在，请更换账号");
        }

        String businessLicenseAddress = validateBusinessLicenseAddress(body.getBusinessLicense());
        LicenseVerifyResult license = licenseService.requireVerified(resourcePathOf(businessLicenseAddress));
        if (!license.getCreditCode().equalsIgnoreCase(StringUtils.trim(body.getCompanyCreditCode())))
        {
            throw new ServiceException("统一社会信用代码与营业执照核验结果不一致，请核对后重试");
        }

        ShopMerchant merchant = fromBody(body);
        merchant.setBusinessLicense(businessLicenseAddress);
        merchant.setCompanyCreditCode(license.getCreditCode());
        merchant.setLegalPerson(license.getLegalPerson());
        merchant.setLicenseVerified("1");
        merchant.setAccountUsername(accountUsername);
        merchant.setAccountPassword(SecurityUtils.encryptPassword(body.getPassword()));
        merchant.setAuditStatus(PENDING);
        merchant.setStatus("0");
        merchant.setDelFlag("0");
        merchant.setCreateBy(accountUsername);
        merchant.setUpdateBy(accountUsername);

        String fromStatus = null;
        String action = "SUBMIT";
        if (existing == null)
        {
            merchant.setApplicationNo("M" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
            merchantMapper.insert(merchant);
        }
        else
        {
            fromStatus = existing.getAuditStatus();
            action = "RESUBMIT";
            merchant.setMerchantId(existing.getMerchantId());
            if (merchantMapper.resubmit(merchant) == 0)
            {
                throw new ServiceException("商家申请状态已变更，请刷新后重试");
            }
        }

        insertAuditLog(merchant.getMerchantId(), action, fromStatus, PENDING, "提交商家入驻申请",
                "MERCHANT_APPLICANT", null, accountUsername);
        return new ShopMerchantApplyResult(detail(merchant.getMerchantId()));
    }

    public List<ShopMerchant> selectAdminList(ShopMerchant query)
    {
        return merchantMapper.selectAdminList(query);
    }

    public ShopMerchant detail(long merchantId)
    {
        return withAuditLogs(requireMerchant(merchantId));
    }

    @Transactional
    public ShopMerchant audit(long merchantId, ShopMerchantAuditBody body, String operator)
    {
        ShopMerchant merchant = requireMerchant(merchantId);
        if (!PENDING.equals(merchant.getAuditStatus()))
        {
            throw new ServiceException("只能审核待审核的商家申请");
        }

        Long adminUserId = null;
        if (APPROVED.equals(body.getDecision()))
        {
            String accountUsername = merchant.getAccountUsername();
            if (sysUserService.selectUserByUserName(accountUsername) != null)
            {
                throw new ServiceException("商家后台用户名已存在");
            }
            Long roleId = merchantMapper.selectRoleIdByKey(MERCHANT_ROLE_KEY);
            if (roleId == null)
            {
                throw new ServiceException("商家角色配置异常，请联系管理员");
            }

            SysUser account = new SysUser();
            account.setUserName(accountUsername);
            account.setNickName(merchant.getCompanyName());
            account.setPhonenumber(merchant.getContactPhone());
            account.setSex("2");
            account.setPassword(merchant.getAccountPassword());
            account.setStatus("0");
            account.setDelFlag("0");
            account.setRoleIds(new Long[] { roleId });
            account.setCreateBy(operator);
            account.setRemark("商家入驻审核通过自动创建，商家ID：" + merchantId);
            if (sysUserService.insertUser(account) == 0)
            {
                throw new ServiceException("创建商家后台账号失败");
            }
            adminUserId = account.getUserId();
        }
        else if (StringUtils.isEmpty(StringUtils.trim(body.getAuditRemark())))
        {
            throw new ServiceException("驳回申请时必须填写原因");
        }

        String remark = StringUtils.trim(body.getAuditRemark());
        if (merchantMapper.updateAudit(merchantId, body.getDecision(), remark, adminUserId, operator) == 0)
        {
            throw new ServiceException("商家审核状态已变更，请刷新后重试");
        }
        insertAuditLog(merchantId, APPROVED.equals(body.getDecision()) ? "APPROVE" : "REJECT",
                PENDING, body.getDecision(), remark, "SYS_USER", SecurityUtils.getUserId(), operator);
        return detail(merchantId);
    }

    @Transactional
    public int updateStatus(long merchantId, String status, String operator)
    {
        ShopMerchant merchant = requireMerchant(merchantId);
        if (!APPROVED.equals(merchant.getAuditStatus()) || merchant.getAdminUserId() == null)
        {
            throw new ServiceException("只能启停已审核通过的商家");
        }
        int rows = merchantMapper.updateStatus(merchantId, status, operator);
        if (rows > 0)
        {
            SysUser account = new SysUser(merchant.getAdminUserId());
            account.setStatus(status);
            sysUserService.updateUserStatus(account);
            if ("1".equals(status))
            {
                invalidateSessions(merchant.getAdminUserId());
            }
            insertAuditLog(merchantId, "0".equals(status) ? "ENABLE" : "DISABLE",
                    APPROVED, APPROVED, "0".equals(status) ? "启用商家" : "停用商家",
                    "SYS_USER", SecurityUtils.getUserId(), operator);
        }
        return rows;
    }

    public ShopMerchant currentMerchantAccount()
    {
        ShopMerchant merchant = merchantMapper.selectByAdminUserId(SecurityUtils.getUserId());
        if (merchant == null || !APPROVED.equals(merchant.getAuditStatus()))
        {
            throw new ServiceException("当前后台账号未绑定已通过审核的商家");
        }
        if (!"0".equals(merchant.getStatus()))
        {
            throw new ServiceException("商家已停用");
        }
        return merchant;
    }

    private ShopMerchant fromBody(ShopMerchantApplyBody body)
    {
        ShopMerchant merchant = new ShopMerchant();
        merchant.setCompanyName(body.getCompanyName().trim());
        merchant.setCompanyAddress(body.getCompanyAddress().trim());
        merchant.setContactName(body.getContactName().trim());
        merchant.setContactPhone(body.getContactPhone().trim());
        merchant.setProductIntro(body.getProductIntro().trim());
        merchant.setOriginTraceability(body.getOriginTraceability().trim());
        merchant.setAcceptsVerificationRecruitment(Boolean.TRUE.equals(body.getAcceptsVerificationRecruitment()) ? "0" : "1");
        merchant.setAcceptsPublicWelfare(Boolean.TRUE.equals(body.getAcceptsPublicWelfare()) ? "0" : "1");
        merchant.setProtocolAgreed(Boolean.TRUE.equals(body.getProtocolAgreed()) ? "0" : "1");
        return merchant;
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

    private void validateBusinessLicense(MultipartFile file)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("请选择营业执照图片");
        }
        if (file.getSize() > MAX_LICENSE_SIZE)
        {
            throw new ServiceException("营业执照图片不能超过 5MB");
        }
        if (!LICENSE_CONTENT_TYPES.contains(file.getContentType()))
        {
            throw new ServiceException("营业执照仅支持 JPG、PNG 格式");
        }
        try (InputStream input = file.getInputStream())
        {
            BufferedImage image = ImageIO.read(input);
            if (image == null)
            {
                throw new ServiceException("营业执照文件不是有效图片");
            }
        }
        catch (IOException exception)
        {
            throw new ServiceException("营业执照图片读取失败");
        }
    }

    private String resourcePathOf(String address)
    {
        try
        {
            String path = URI.create(address).getPath();
            return path == null ? "" : path;
        }
        catch (IllegalArgumentException exception)
        {
            return "";
        }
    }

    private String validateBusinessLicenseAddress(String value)
    {
        String address = StringUtils.trim(value);
        try
        {
            String resourcePath = URI.create(address).getPath();
            if (resourcePath == null
                    || !resourcePath.matches("^/profile/upload/merchant-license/"
                            + "\\d{4}/\\d{2}/\\d{2}/[A-Za-z0-9_-]+\\.(?i:jpg|jpeg|png)$"))
            {
                throw new ServiceException("请上传有效的营业执照图片");
            }
            Path profile = Paths.get(RuoYiConfig.getProfile()).toAbsolutePath().normalize();
            Path uploaded = profile.resolve(resourcePath.substring("/profile/".length())).normalize();
            if (!uploaded.startsWith(profile) || !Files.isRegularFile(uploaded))
            {
                throw new ServiceException("营业执照图片不存在，请重新上传");
            }
            return address;
        }
        catch (IllegalArgumentException exception)
        {
            throw new ServiceException("营业执照地址无效，请重新上传");
        }
    }

    private ShopMerchant requireMerchant(long merchantId)
    {
        ShopMerchant merchant = merchantMapper.selectById(merchantId);
        if (merchant == null)
        {
            throw new ServiceException("商家不存在");
        }
        return merchant;
    }

    private ShopMerchant withAuditLogs(ShopMerchant merchant)
    {
        merchant.setAuditLogs(merchantMapper.selectAuditLogs(merchant.getMerchantId()));
        return merchant;
    }

    private String normalizeAccountUsername(String value)
    {
        String username = StringUtils.trim(value);
        if (StringUtils.isEmpty(username) || !username.matches("^[A-Za-z0-9_]{4,30}$"))
        {
            throw new ServiceException("商家后台用户名必须为4到30位字母、数字或下划线");
        }
        return username;
    }

    private void validateInitialPassword(String password)
    {
        if (StringUtils.isEmpty(password) || password.length() < 6 || password.length() > 50
                || !password.matches("^(?=.*[A-Za-z])(?=.*\\d).+$"))
        {
            throw new ServiceException("初始密码必须为6到50位，且同时包含字母和数字");
        }
    }

    private void insertAuditLog(Long merchantId, String action, String fromStatus, String toStatus,
            String remark, String operatorType, Long operatorId, String operatorName)
    {
        ShopMerchantAuditLog log = new ShopMerchantAuditLog();
        log.setMerchantId(merchantId);
        log.setAction(action);
        log.setFromStatus(fromStatus);
        log.setToStatus(toStatus);
        log.setAuditRemark(remark);
        log.setOperatorType(operatorType);
        log.setOperatorId(operatorId);
        log.setOperatorName(operatorName);
        merchantMapper.insertAuditLog(log);
    }

    private void invalidateSessions(Long sysUserId)
    {
        Collection<String> keys = redisCache.keys(CacheConstants.LOGIN_TOKEN_KEY + "*");
        if (keys == null || keys.isEmpty())
        {
            return;
        }
        for (String key : keys)
        {
            LoginUser loginUser = redisCache.getCacheObject(key);
            if (loginUser != null && sysUserId.equals(loginUser.getUserId()))
            {
                redisCache.deleteObject(key);
            }
        }
    }
}
