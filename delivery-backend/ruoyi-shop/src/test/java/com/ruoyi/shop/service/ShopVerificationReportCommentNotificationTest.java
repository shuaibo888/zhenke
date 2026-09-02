package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportComment;
import com.ruoyi.shop.domain.dto.ShopReportCommentBody;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopVerificationReportCommentMapper;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopVerificationReportCommentNotificationTest
{
    private final ShopVerificationReportCommentMapper commentMapper =
            mock(ShopVerificationReportCommentMapper.class);
    private final ShopTrialMapper trialMapper = mock(ShopTrialMapper.class);
    private final ShopNotificationService notificationService = mock(ShopNotificationService.class);
    private final ShopVerificationReportCommentService service =
            new ShopVerificationReportCommentService(commentMapper, trialMapper, notificationService);

    @AfterEach
    void cleanUp()
    {
        SecurityContextHolder.clearContext();
    }

    @Test
    void persistedCommentIsForwardedToNotificationServiceInsideTheWriteFlow()
    {
        authenticateShopUser(18L);
        ShopVerificationReport report = new ShopVerificationReport();
        report.setReportId(70L);
        report.setShopUserId(27L);
        report.setStatus("PUBLISHED");
        when(trialMapper.selectReportById(70L)).thenReturn(report);

        ShopVerificationReportComment saved = new ShopVerificationReportComment();
        saved.setCommentId(81L);
        saved.setReportId(70L);
        saved.setShopUserId(18L);
        saved.setContent("内容很有帮助");
        when(commentMapper.insertComment(any())).thenAnswer(invocation -> {
            ShopVerificationReportComment value = invocation.getArgument(0);
            value.setCommentId(81L);
            return 1;
        });
        when(commentMapper.selectActiveComment(70L, 81L)).thenReturn(saved);
        ShopReportCommentBody body = new ShopReportCommentBody();
        body.setContent("内容很有帮助");

        ShopVerificationReportComment result = service.create(70L, body);

        assertEquals(81L, result.getCommentId());
        verify(notificationService).reportComment(report, saved);
    }

    private void authenticateShopUser(long userId)
    {
        SysUser user = new SysUser();
        user.setPhonenumber("13800000000");
        LoginUser principal = new LoginUser(
                ShopAccountIdentity.toPrincipalId(userId), null, user,
                Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
