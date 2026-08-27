package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopReportResourceServiceSecurityTest {
  private final ShopReportResourceService service = new ShopReportResourceService();

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void rejectsImageWhoseBytesDoNotMatchItsExtension() {
    authenticateShopUser(18L);
    MockMultipartFile spoofedImage =
        new MockMultipartFile(
            "file", "photo.jpg", "image/jpeg", "not-a-jpeg".getBytes(StandardCharsets.UTF_8));

    assertThrows(ServiceException.class, () -> service.upload(spoofedImage));
  }

  @Test
  void rejectsMp4WithoutReadableMovieDuration() {
    authenticateShopUser(18L);
    byte[] incompleteMp4 = new byte[] {
        0, 0, 0, 12, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'
    };
    MockMultipartFile video =
        new MockMultipartFile("file", "clip.mp4", "video/mp4", incompleteMp4);

    assertThrows(ServiceException.class, () -> service.upload(video));
  }

  @Test
  void rejectsUnsupportedMediaExtensionBeforeWritingAFile() {
    authenticateShopUser(18L);
    MockMultipartFile gif =
        new MockMultipartFile("file", "animation.gif", "image/gif", new byte[] { 'G', 'I', 'F' });

    assertThrows(ServiceException.class, () -> service.upload(gif));
  }

  private void authenticateShopUser(long userId) {
    SysUser user = new SysUser();
    user.setPhonenumber("13800000000");
    LoginUser principal =
        new LoginUser(
            ShopAccountIdentity.toPrincipalId(userId),
            null,
            user,
            Set.of(ShopAccountIdentity.SHOP_USER_PERMISSION));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
  }
}
