package com.ruoyi.shop.service;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.constant.CacheConstants;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.exception.user.CaptchaException;
import com.ruoyi.common.exception.user.CaptchaExpireException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopMerchant;
import com.ruoyi.shop.domain.ShopMerchantAuditLog;
import com.ruoyi.shop.domain.dto.ShopMerchantApplyBody;
import com.ruoyi.shop.domain.dto.ShopMerchantAuditBody;
import com.ruoyi.shop.domain.dto.ShopMerchantQueryBody;
import com.ruoyi.shop.domain.vo.ShopMerchantApplyResult;
import com.ruoyi.shop.mapper.ShopMerchantMapper;
import com.ruoyi.system.service.ISysConfigService;
import com.ruoyi.system.service.ISysUserService;

@Service
public class ShopMerchantService
{
    public static final String PENDING = "PENDING";
    public static final String APPROVED = "APPROVED";
    public static final String REJECTED = "REJECTED";
    private static final String MERCHANT_ROLE_KEY = "merchant";

    private final ShopMerchantMapper merchantMapper;
    private final ISysUserService sysUserService;
    private final RedisCache redisCache;
    private final ISysConfigService configService;

    public ShopMerchantService(ShopMerchantMapper merchantMapper, ISysUserService sysUserService,
            RedisCache redisCache, ISysConfigService configService)
    {
        this.merchantMapper = merchantMapper;
        this.sysUserService = sysUserService;
        this.redisCache = redisCache;
        this.configService = configService;
    }

    public ShopMerchant applicationStatus(ShopMerchantQueryBody body)
    {
        ShopMerchant merchant = merchantMapper.selectByApplicationNo(StringUtils.trim(body.getApplicationNo()));
        verifyQueryToken(merchant, body.getQueryToken());
        return withAuditLogs(merchant);
    }

    @Transactional
    public ShopMerchantApplyResult apply(ShopMerchantApplyBody body)
    {
        validateCaptcha(body.getCode(), body.getUuid());
        String accountUsername = normalizeAccountUsername(body.getAccountUsername());
        validateInitialPassword(body.getPassword());

        ShopMerchant existing = null;
        String queryToken;
        if (StringUtils.isNotEmpty(body.getApplicationNo()) || StringUtils.isNotEmpty(body.getQueryToken()))
        {
            existing = merchantMapper.selectByApplicationNo(StringUtils.trim(body.getApplicationNo()));
            verifyQueryToken(existing, body.getQueryToken());
            if (!REJECTED.equals(existing.getAuditStatus()))
            {
                throw new ServiceException("只有已驳回的申请可以重新提交");
            }
            queryToken = body.getQueryToken();
        }
        else
        {
            queryToken = UUID.randomUUID().toString().replace("-", "")
                    + UUID.randomUUID().toString().replace("-", "");
        }

        ShopMerchant usernameOwner = merchantMapper.selectByAccountUsername(accountUsername);
        if (sysUserService.selectUserByUserName(accountUsername) != null
                || (usernameOwner != null && (existing == null
                        || !usernameOwner.getMerchantId().equals(existing.getMerchantId()))))
        {
            throw new ServiceException("商家后台账号已存在，请更换账号");
        }

        ShopMerchant merchant = fromBody(body);
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
            merchant.setQueryTokenHash(SecurityUtils.encryptPassword(queryToken));
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
        return new ShopMerchantApplyResult(detail(merchant.getMerchantId()), queryToken);
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
                throw new ServiceException("商家角色尚未初始化，请先执行 shop_merchant.sql");
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
        merchant.setBusinessLicense(body.getBusinessLicense().trim());
        merchant.setProductIntro(body.getProductIntro().trim());
        merchant.setOriginTraceability(body.getOriginTraceability().trim());
        merchant.setAcceptsVerificationRecruitment(Boolean.TRUE.equals(body.getAcceptsVerificationRecruitment()) ? "0" : "1");
        merchant.setAcceptsPublicWelfare(Boolean.TRUE.equals(body.getAcceptsPublicWelfare()) ? "0" : "1");
        merchant.setProtocolAgreed(Boolean.TRUE.equals(body.getProtocolAgreed()) ? "0" : "1");
        return merchant;
    }

    private void verifyQueryToken(ShopMerchant merchant, String queryToken)
    {
        if (merchant == null || StringUtils.isEmpty(queryToken)
                || !SecurityUtils.matchesPassword(queryToken, merchant.getQueryTokenHash()))
        {
            throw new ServiceException("申请编号或查询凭证无效");
        }
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
