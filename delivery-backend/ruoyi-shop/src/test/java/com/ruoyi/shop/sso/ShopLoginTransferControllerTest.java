package com.ruoyi.shop.sso;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.framework.web.service.TokenService;
import com.ruoyi.shop.controller.ShopLoginTransferController;
import com.ruoyi.shop.domain.dto.ShopSsoLoginBody;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.service.ShopAccountService;

class ShopLoginTransferControllerTest
{
    private final ShopLoginTransferService service = mock(ShopLoginTransferService.class);
    private final TokenService tokens = mock(TokenService.class);
    private final ShopLoginTransferController controller = new ShopLoginTransferController(service, tokens);

    @Test
    void successfulTransferRevokesOnlyPreviousBrowserSession()
    {
        var request = new MockHttpServletRequest();
        request.addHeader("User-Agent", "MicroMessenger");
        var response = new MockHttpServletResponse();
        var body = new ShopSsoLoginBody();
        body.setTicket("ticket");
        var old = new LoginUser();
        old.setToken("old-wechat-session");
        old.setPermissions(Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        when(tokens.getLoginUser(request)).thenReturn(old);
        when(service.exchange("ticket", "MicroMessenger")).thenReturn(new ShopLoginTransferService.TransferLogin(
                new ShopAccountService.LoginResult("new-account-token", null), "/checkout?orderId=12"));
        var result = controller.login(body, request, response);
        assertEquals("new-account-token", result.get("token"));
        assertEquals("/checkout?orderId=12", result.get("redirectPath"));
        assertEquals("no-store", response.getHeader("Cache-Control"));
        verify(tokens).delLoginUser("old-wechat-session");
    }

    @Test
    void invalidLinkDoesNotLogOutExistingAccount()
    {
        var request = new MockHttpServletRequest();
        request.addHeader("User-Agent", "MicroMessenger");
        var body = new ShopSsoLoginBody();
        body.setTicket("invalid");
        when(service.exchange("invalid", "MicroMessenger")).thenThrow(new ServiceException("expired"));
        assertThrows(ServiceException.class, () -> controller.login(body, request, new MockHttpServletResponse()));
        verifyNoInteractions(tokens);
    }
}
