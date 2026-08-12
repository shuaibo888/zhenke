package com.ruoyi.shop.sso;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import com.ruoyi.common.exception.ServiceException;

class EventSsoServiceTest
{
    private final EventSsoService service = new EventSsoService(new EventSsoProperties());

    @Test
    void readsPhoneFromSuccessfulResponse()
    {
        EventSsoIdentity identity = service.parseResponse(200,
                "{\"code\":0,\"message\":\"success\",\"data\":{\"phone\":\"13800138000\",\"username\":\"张三\"}}",
                "request-1");

        assertEquals("13800138000", identity.phone());
        assertEquals("张三", identity.nickname());
    }

    @Test
    void rejectsExpiredTicketWithActionableMessage()
    {
        ServiceException exception = assertThrows(ServiceException.class, () -> service.parseResponse(410,
                "{\"code\":\"TICKET_EXPIRED\",\"message\":\"expired\"}", "request-2"));

        assertEquals("登录票据已过期，请重新从赛事系统进入", exception.getMessage());
    }

    @Test
    void rejectsInvalidPhone()
    {
        ServiceException exception = assertThrows(ServiceException.class, () -> service.parseResponse(200,
                "{\"code\":0,\"data\":{\"phone\":\"not-a-phone\",\"username\":\"张三\"}}", "request-3"));

        assertEquals("赛事系统返回的手机号格式错误，请联系管理员", exception.getMessage());
    }

    @Test
    void rejectsMissingNickname()
    {
        ServiceException exception = assertThrows(ServiceException.class, () -> service.parseResponse(200,
                "{\"code\":0,\"data\":{\"phone\":\"13800138000\"}}", "request-4"));

        assertEquals("赛事系统返回的用户昵称格式错误，请联系管理员", exception.getMessage());
    }
}
