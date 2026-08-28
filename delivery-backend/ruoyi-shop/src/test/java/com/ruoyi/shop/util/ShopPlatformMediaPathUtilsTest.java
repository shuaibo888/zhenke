package com.ruoyi.shop.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.exception.ServiceException;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ShopPlatformMediaPathUtilsTest {
  @TempDir Path tempDirectory;

  @Test
  void normalizesRelativeAndEnvironmentSpecificUploadUrls() {
    assertEquals(
        "/profile/upload/media/photo.jpg",
        ShopPlatformMediaPathUtils.normalize("/profile/upload/media/photo.jpg"));
    assertEquals(
        "/profile/upload/media/photo.jpg",
        ShopPlatformMediaPathUtils.normalize("/api/profile/upload/media/photo.jpg"));
    assertEquals(
        "/profile/upload/media/photo.jpg",
        ShopPlatformMediaPathUtils.normalize(
            "http://127.0.0.1:8080/api/profile/upload/media/photo.jpg"));
    assertEquals(
        "/profile/upload/media/photo.jpg",
        ShopPlatformMediaPathUtils.normalize(
            "https://dzshop.vip/profile/upload/media/photo.jpg"));
  }

  @Test
  void rejectsExternalQueryCredentialAndTraversalReferences() {
    assertThrows(
        ServiceException.class,
        () -> ShopPlatformMediaPathUtils.normalize("https://cdn.example.com/photo.jpg"));
    assertThrows(
        ServiceException.class,
        () ->
            ShopPlatformMediaPathUtils.normalize(
                "https://user:secret@example.com/profile/upload/photo.jpg"));
    assertThrows(
        ServiceException.class,
        () -> ShopPlatformMediaPathUtils.normalize("/profile/upload/photo.jpg?size=large"));
    assertThrows(
        ServiceException.class,
        () -> ShopPlatformMediaPathUtils.normalize("/profile/upload/photo.jpg#preview"));
    assertThrows(
        ServiceException.class,
        () -> ShopPlatformMediaPathUtils.normalize("/profile/upload/../secret.jpg"));
    assertThrows(
        ServiceException.class,
        () -> ShopPlatformMediaPathUtils.normalize("/profile/upload/%2e%2e/secret.jpg"));
    assertThrows(
        ServiceException.class,
        () -> ShopPlatformMediaPathUtils.normalize("/profile/upload/%2e%2e%5csecret.jpg"));
  }

  @Test
  void storedImageMustExistInsideProfileAndContainReadableImageBytes() throws Exception {
    String previousProfile = RuoYiConfig.getProfile();
    try {
      new RuoYiConfig().setProfile(tempDirectory.toString());
      Path image = tempDirectory.resolve("upload/media/photo.jpg");
      Files.createDirectories(image.getParent());
      ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "jpg", image.toFile());
      ShopPlatformMediaPathUtils.requireStoredImage(
          "http://127.0.0.1:8080/api/profile/upload/media/photo.jpg");

      Path fakeImage = tempDirectory.resolve("upload/media/fake.jpg");
      Files.writeString(fakeImage, "not an image");
      assertThrows(
          ServiceException.class,
          () -> ShopPlatformMediaPathUtils.requireStoredImage("/profile/upload/media/fake.jpg"));
      assertThrows(
          ServiceException.class,
          () -> ShopPlatformMediaPathUtils.requireStoredFile("/profile/upload/media/missing.jpg"));
    } finally {
      new RuoYiConfig().setProfile(previousProfile);
    }
  }
}
