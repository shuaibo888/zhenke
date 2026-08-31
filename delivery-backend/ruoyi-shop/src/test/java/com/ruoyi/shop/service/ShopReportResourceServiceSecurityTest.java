package com.ruoyi.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.core.domain.entity.SysUser;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.security.ShopAccountIdentity;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Set;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ShopReportResourceServiceSecurityTest {
  private final ShopReportResourceService service = new ShopReportResourceService();

  @TempDir Path tempDirectory;

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
  void validatesMp4AsAStreamWithoutMaterializingTheWholeUpload() {
    String previousProfile = RuoYiConfig.getProfile();
    try {
      new RuoYiConfig().setProfile(tempDirectory.toString());
      authenticateShopUser(18L);
      ByteBuffer content = ByteBuffer.allocate(48);
      content.putInt(12).put("ftyp".getBytes(StandardCharsets.US_ASCII)).put("isom".getBytes(StandardCharsets.US_ASCII));
      content.putInt(36).put("moov".getBytes(StandardCharsets.US_ASCII));
      content.putInt(28).put("mvhd".getBytes(StandardCharsets.US_ASCII));
      content.putInt(0).putInt(0).putInt(0).putInt(1_000).putInt(30_000);
      MockMultipartFile video = new StreamingOnlyMultipartFile(content.array());

      String resourcePath = service.upload(video);

      assertTrue(resourcePath.startsWith("/profile/upload/report/user-18/"));
      assertTrue(resourcePath.endsWith(".mp4"));
    } finally {
      new RuoYiConfig().setProfile(previousProfile);
    }
  }

  @Test
  void rejectsPathologicallyNestedMp4BoxesWithoutOverflowingTheStack() {
    authenticateShopUser(18L);
    int nestedBoxes = 2_000;
    ByteBuffer content = ByteBuffer.allocate(12 + nestedBoxes * 8);
    content.putInt(12).put("ftyp".getBytes(StandardCharsets.US_ASCII)).put("isom".getBytes(StandardCharsets.US_ASCII));
    for (int index = 0; index < nestedBoxes; index++) {
      content.putInt((nestedBoxes - index) * 8);
      content.put("moov".getBytes(StandardCharsets.US_ASCII));
    }
    MockMultipartFile video = new MockMultipartFile("file", "nested.mp4", "video/mp4", content.array());

    assertThrows(ServiceException.class, () -> service.upload(video));
  }

  @Test
  void rejectsUnsupportedMediaExtensionBeforeWritingAFile() {
    authenticateShopUser(18L);
    MockMultipartFile gif =
        new MockMultipartFile("file", "animation.gif", "image/gif", new byte[] { 'G', 'I', 'F' });

    assertThrows(ServiceException.class, () -> service.upload(gif));
  }

  @Test
  void storesReportMediaInTheAuthenticatedUsersNamespaceAndVerifiesOwnership() throws Exception {
    String previousProfile = RuoYiConfig.getProfile();
    try {
      new RuoYiConfig().setProfile(tempDirectory.toString());
      authenticateShopUser(18L);
      ByteArrayOutputStream imageBytes = new ByteArrayOutputStream();
      ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "jpg", imageBytes);
      MockMultipartFile image = new MockMultipartFile(
          "file", "visit.jpg", "image/jpeg", imageBytes.toByteArray());

      String resourcePath = service.upload(image);

      assertTrue(resourcePath.startsWith("/profile/upload/report/user-18/"));
      assertEquals(resourcePath,
          service.normalizeOwnedResourceUrl(
              18L, "IMAGE", "http://127.0.0.1:8080/api" + resourcePath));
      assertThrows(ServiceException.class,
          () -> service.normalizeOwnedResourceUrl(19L, "IMAGE", resourcePath));
      assertThrows(ServiceException.class,
          () -> service.normalizeOwnedResourceUrl(18L, "VIDEO", resourcePath));
    } finally {
      new RuoYiConfig().setProfile(previousProfile);
    }
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

  private static final class StreamingOnlyMultipartFile extends MockMultipartFile {
    private StreamingOnlyMultipartFile(byte[] content) {
      super("file", "clip.mp4", "video/mp4", content);
    }

    @Override
    public byte[] getBytes() throws IOException {
      throw new AssertionError("video validation must not allocate the complete upload");
    }
  }
}
