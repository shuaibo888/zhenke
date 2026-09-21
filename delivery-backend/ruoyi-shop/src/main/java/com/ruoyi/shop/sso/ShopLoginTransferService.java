package com.ruoyi.shop.sso;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import com.ruoyi.common.constant.CacheConstants;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.service.ShopAccountService;
import com.ruoyi.shop.service.ShopOrderService;

/** Cross-browser full login; tickets are opaque, short-lived and atomically consumed. */
@Service
public class ShopLoginTransferService
{
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String PREFIX = "shop:login-transfer:";
    private static final DefaultRedisScript<String> CONSUME = new DefaultRedisScript<>(
            "local v = redis.call('get', KEYS[1]); if v then redis.call('del', KEYS[1]); end; return v",
            String.class);
    private final StringRedisTemplate redis;
    private final RedisCache sessions;
    private final ShopOrderMapper orders;
    private final ShopAccountService accounts;

    public ShopLoginTransferService(StringRedisTemplate redis, RedisCache sessions,
            ShopOrderMapper orders, ShopAccountService accounts)
    {
        this.redis = redis;
        this.sessions = sessions;
        this.orders = orders;
        this.accounts = accounts;
    }

    public TransferTicket create(long orderId)
    {
        long userId = ShopAccountIdentity.requireShopUserId();
        ShopOrder order = orders.selectUserOrder(userId, orderId);
        if (order == null || !ShopOrderService.PENDING_PAYMENT.equals(order.getStatus()))
        {
            throw new ServiceException("订单不存在或已不需要付款，请刷新订单");
        }
        long now = System.currentTimeMillis();
        long expiresAt = Math.min(now + Duration.ofMinutes(5).toMillis(),
                order.getPaymentExpireTime() == null ? now : order.getPaymentExpireTime().getTime());
        if (expiresAt <= now) throw new ServiceException("订单已超时，请重新下单");
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String sourceToken = SecurityUtils.getLoginUser().getToken();
        redis.opsForValue().set(PREFIX + ticket, userId + ":" + orderId + ":" + sourceToken,
                Duration.ofMillis(expiresAt - now));
        return new TransferTicket(ticket, expiresAt);
    }

    public TransferLogin exchange(String ticket, String userAgent)
    {
        // Do not let external browser/link previews consume the login credential.
        if (userAgent == null || !userAgent.toLowerCase(Locale.ROOT).contains("micromessenger"))
        {
            throw new ServiceException("请将链接复制到微信中打开");
        }
        if (ticket == null || !ticket.matches("[A-Za-z0-9_-]{43}")) throw invalidTicket();
        String value = redis.execute(CONSUME, List.of(PREFIX + ticket));
        if (value == null) throw invalidTicket();
        String[] parts = value.split(":", 3);
        if (parts.length != 3) throw invalidTicket();
        long userId;
        long orderId;
        try
        {
            userId = Long.parseLong(parts[0]);
            orderId = Long.parseLong(parts[1]);
        }
        catch (NumberFormatException exception)
        {
            throw invalidTicket();
        }
        LoginUser source = sessions.getCacheObject(CacheConstants.LOGIN_TOKEN_KEY + parts[2]);
        if (source == null || !Long.valueOf(ShopAccountIdentity.toPrincipalId(userId)).equals(source.getUserId())
                || orders.selectUserOrder(userId, orderId) == null)
        {
            throw invalidTicket();
        }
        return new TransferLogin(accounts.loginByVerifiedTransfer(userId), "/checkout?orderId=" + orderId);
    }

    private ServiceException invalidTicket()
    {
        return new ServiceException("免登录链接已失效或已使用，请回原浏览器重新获取");
    }

    public record TransferTicket(String ticket, long expiresAt) { }
    public record TransferLogin(ShopAccountService.LoginResult login, String redirectPath) { }
}
