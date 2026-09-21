package com.ruoyi.shop.sso;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Duration;
import java.util.Date;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import com.ruoyi.common.constant.CacheConstants;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.domain.ShopOrder;
import com.ruoyi.shop.mapper.ShopOrderMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.service.ShopAccountService;

class ShopLoginTransferServiceTest
{
    private static final String TICKET = "a".repeat(43);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final RedisCache sessions = mock(RedisCache.class);
    private final ShopOrderMapper orders = mock(ShopOrderMapper.class);
    private final ShopAccountService accounts = mock(ShopAccountService.class);
    private final ShopLoginTransferService service = new ShopLoginTransferService(redis, sessions, orders, accounts);
    private final LoginUser source = new LoginUser();
    private ShopOrder order;

    @BeforeEach
    void setup()
    {
        SysUser user = new SysUser();
        user.setPhonenumber("13800138000");
        source.setUser(user);
        source.setUserId(ShopAccountIdentity.toPrincipalId(7));
        source.setPermissions(Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        source.setToken("source-session");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(source, null, Set.of()));
        order = new ShopOrder();
        order.setStatus("PENDING_PAYMENT");
        order.setPaymentExpireTime(new Date(System.currentTimeMillis() + 60_000));
        when(orders.selectUserOrder(7L, 12L)).thenReturn(order);
    }

    @AfterEach
    void cleanup() { SecurityContextHolder.clearContext(); }

    @Test
    @SuppressWarnings("unchecked")
    void createsOpaqueTicketBoundToOwnerOrderAndSourceSessionWithLimitedTtl()
    {
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        var result = service.create(12);
        assertTrue(result.ticket().matches("[A-Za-z0-9_-]{43}"));
        assertEquals(order.getPaymentExpireTime().getTime(), result.expiresAt());
        ArgumentCaptor<Duration> ttl = ArgumentCaptor.forClass(Duration.class);
        verify(values).set(eq("shop:login-transfer:" + result.ticket()), eq("7:12:source-session"), ttl.capture());
        assertTrue(ttl.getValue().toMillis() > 0 && ttl.getValue().toMillis() <= 60_000);
    }

    @Test
    void cannotCreateForAnotherUsersOrder()
    {
        assertThrows(ServiceException.class, () -> service.create(999));
        verifyNoInteractions(redis);
    }

    @Test
    void rejectsExpiredOrNonPendingOrder()
    {
        order.setStatus("PAID");
        assertThrows(ServiceException.class, () -> service.create(12));
        order.setStatus("PENDING_PAYMENT");
        order.setPaymentExpireTime(new Date(0));
        assertThrows(ServiceException.class, () -> service.create(12));
        verifyNoInteractions(redis);
    }

    @Test
    void anonymousOrAdminCannotMintTickets()
    {
        source.setPermissions(Set.of("*:*:*"));
        assertThrows(ServiceException.class, () -> service.create(12));
        SecurityContextHolder.clearContext();
        assertThrows(ServiceException.class, () -> service.create(12));
        verifyNoInteractions(redis);
    }

    @Test
    void externalBrowserAndMalformedTicketDoNotConsumeTicket()
    {
        assertThrows(ServiceException.class, () -> service.exchange(TICKET, "Chrome"));
        assertThrows(ServiceException.class, () -> service.exchange("invalid", "MicroMessenger"));
        verifyNoInteractions(redis, accounts);
    }

    @Test
    @SuppressWarnings("unchecked")
    void exchangesOnlyOnceForOriginalFullAccountWithServerChosenOrderDestination()
    {
        when(redis.execute(any(RedisScript.class), anyList())).thenReturn("7:12:source-session").thenReturn(null);
        when(sessions.getCacheObject(CacheConstants.LOGIN_TOKEN_KEY + "source-session")).thenReturn(source);
        var login = new ShopAccountService.LoginResult("normal-session", null);
        when(accounts.loginByVerifiedTransfer(7)).thenReturn(login);
        // Current browser identity is irrelevant: the ticket determines the target account.
        SecurityContextHolder.clearContext();
        var result = service.exchange(TICKET, "MicroMessenger");
        assertSame(login, result.login());
        assertEquals("/checkout?orderId=12", result.redirectPath());
        assertThrows(ServiceException.class, () -> service.exchange(TICKET, "MicroMessenger"));
        verify(accounts, times(1)).loginByVerifiedTransfer(7);
    }

    @Test
    @SuppressWarnings("unchecked")
    void loggedOutSourceSessionCannotBeTransferred()
    {
        when(redis.execute(any(RedisScript.class), anyList())).thenReturn("7:12:source-session");
        assertThrows(ServiceException.class, () -> service.exchange(TICKET, "MicroMessenger"));
        verifyNoInteractions(accounts);
    }

    @Test
    @SuppressWarnings("unchecked")
    void expiredOrUsedTicketCannotIssueLogin()
    {
        when(redis.execute(any(RedisScript.class), anyList())).thenReturn(null);
        assertThrows(ServiceException.class, () -> service.exchange(TICKET, "MicroMessenger"));
        verifyNoInteractions(accounts);
    }
}
