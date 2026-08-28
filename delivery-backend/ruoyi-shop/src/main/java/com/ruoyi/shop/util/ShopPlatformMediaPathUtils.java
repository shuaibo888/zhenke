package com.ruoyi.shop.util;

import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import javax.imageio.ImageIO;

/** Normalizes uploaded platform media references before they are persisted. */
public final class ShopPlatformMediaPathUtils {
  private static final String PROFILE_PREFIX = "/profile/";
  private static final String API_PROFILE_PREFIX = "/api/profile/";

  private ShopPlatformMediaPathUtils() {}

  /**
   * Accepts a platform-relative path or the absolute HTTP(S) preview URL returned by an upload
   * endpoint. The returned value is always a root-relative {@code /profile/...} path.
   */
  public static String normalize(String rawValue) {
    String value = StringUtils.trim(rawValue);
    if (StringUtils.isEmpty(value)
        || value.contains("\\")
        || value.chars().anyMatch(ch -> ch < 0x20 || ch == 0x7f)) {
      throw invalidPath();
    }

    String path;
    String lowered = value.toLowerCase(Locale.ROOT);
    if (lowered.startsWith("http://") || lowered.startsWith("https://")) {
      try {
        URI uri = URI.create(value.replace(" ", "%20"));
        if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
            || uri.getHost() == null
            || uri.getUserInfo() != null
            || uri.getRawQuery() != null
            || uri.getRawFragment() != null) {
          throw invalidPath();
        }
        path = decodePath(uri.getRawPath());
      } catch (IllegalArgumentException exception) {
        throw invalidPath();
      }
    } else {
      if (value.startsWith("//")
          || value.contains("://")
          || value.contains("?")
          || value.contains("#")) {
        throw invalidPath();
      }
      path = decodePath(value);
    }

    if (path.startsWith(API_PROFILE_PREFIX)) {
      path = path.substring("/api".length());
    }
    if (!path.startsWith(PROFILE_PREFIX)
        || path.contains("\\")
        || path.contains("//")
        || path.contains("?")
        || path.contains("#")
        || path.contains("%")
        || path.chars().anyMatch(ch -> ch < 0x20 || ch == 0x7f)) {
      throw invalidPath();
    }
    for (String segment : path.split("/")) {
      if (".".equals(segment) || "..".equals(segment)) throw invalidPath();
    }
    return path;
  }

  /** Requires the normalized reference to resolve to a real regular file inside profile. */
  public static void requireStoredFile(String rawValue) {
    storedFile(rawValue);
  }

  /** Requires the reference to resolve to a stored file whose bytes are a readable image. */
  public static void requireStoredImage(String rawValue) {
    Path file = storedFile(rawValue);
    try {
      if (ImageIO.read(file.toFile()) == null) throw invalidStoredFile();
    } catch (IOException exception) {
      throw invalidStoredFile();
    }
  }

  private static Path storedFile(String rawValue) {
    String path = normalize(rawValue);
    try {
      Path profileRoot = Paths.get(RuoYiConfig.getProfile()).toRealPath();
      Path candidate = profileRoot.resolve(path.substring(PROFILE_PREFIX.length())).normalize();
      if (!candidate.startsWith(profileRoot)) throw invalidStoredFile();
      Path realCandidate = candidate.toRealPath();
      if (!realCandidate.startsWith(profileRoot) || !Files.isRegularFile(realCandidate)) {
        throw invalidStoredFile();
      }
      return realCandidate;
    } catch (ServiceException exception) {
      throw exception;
    } catch (Exception exception) {
      throw invalidStoredFile();
    }
  }

  private static String decodePath(String rawPath) {
    if (rawPath == null) throw invalidPath();
    try {
      return URLDecoder.decode(rawPath.replace("+", "%2B"), StandardCharsets.UTF_8);
    } catch (IllegalArgumentException exception) {
      throw invalidPath();
    }
  }

  private static ServiceException invalidPath() {
    return new ServiceException("媒体必须使用平台上传的文件");
  }

  private static ServiceException invalidStoredFile() {
    return new ServiceException("平台上传的媒体文件不存在或内容无效");
  }
}
