package com.ruoyi.shop.service;

import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.file.FileUploadUtils;
import com.ruoyi.shop.security.ShopAccountIdentity;
import com.ruoyi.shop.util.ShopPlatformMediaPathUtils;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ShopReportResourceService
{
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024L;
    private static final long MAX_VIDEO_SIZE = 10 * 1024 * 1024L;
    private static final double MAX_VIDEO_SECONDS = 30D;
    private static final int MAX_MP4_BOX_DEPTH = 4;
    private static final String[] IMAGE_EXTENSIONS = { "jpg", "jpeg", "png" };
    private static final String[] VIDEO_EXTENSIONS = { "mp4" };
    private static final String REPORT_UPLOAD_PREFIX = "/profile/upload/report/user-";

    public String upload(MultipartFile file)
    {
        long shopUserId = ShopAccountIdentity.requireShopUserId();
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("请选择要上传的图片或视频");
        }

        String extension = extension(file.getOriginalFilename());
        try
        {
            if (isImageExtension(extension))
            {
                validateImage(file, extension);
                return normalizeStoredPath(FileUploadUtils.upload(
                        reportUploadDirectory(shopUserId), file, IMAGE_EXTENSIONS, true));
            }
            if ("mp4".equals(extension))
            {
                validateVideo(file);
                return normalizeStoredPath(FileUploadUtils.upload(
                        reportUploadDirectory(shopUserId), file, VIDEO_EXTENSIONS, true));
            }
        }
        catch (ServiceException e)
        {
            throw e;
        }
        catch (Exception e)
        {
            throw new ServiceException("媒体资源上传失败，请稍后重试");
        }
        throw new ServiceException("图片仅支持 JPG、PNG，视频仅支持 MP4");
    }

    public String normalizeOwnedResourceUrl(long shopUserId, String resourceType, String rawUrl)
    {
        String resourcePath = ShopPlatformMediaPathUtils.normalize(rawUrl);
        String ownerPrefix = REPORT_UPLOAD_PREFIX + shopUserId + "/";
        if (!resourcePath.startsWith(ownerPrefix))
        {
            throw new ServiceException("只能使用当前账号刚上传的甄客验媒体");
        }
        String normalizedType = resourceType == null ? "" : resourceType.trim().toUpperCase(Locale.ROOT);
        String lowerPath = resourcePath.toLowerCase(Locale.ROOT);
        boolean typeMatches = "IMAGE".equals(normalizedType)
                ? lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg") || lowerPath.endsWith(".png")
                : "VIDEO".equals(normalizedType) && lowerPath.endsWith(".mp4");
        if (!typeMatches)
        {
            throw new ServiceException("甄客验媒体类型与文件不一致");
        }
        ShopPlatformMediaPathUtils.requireStoredFile(resourcePath);
        return resourcePath;
    }

    private String reportUploadDirectory(long shopUserId)
    {
        return RuoYiConfig.getUploadPath() + File.separator + "report"
                + File.separator + "user-" + shopUserId;
    }

    private String normalizeStoredPath(String path)
    {
        return path == null ? null : path.replace('\\', '/');
    }

    private void validateImage(MultipartFile file, String extension) throws Exception
    {
        if (file.getSize() > MAX_IMAGE_SIZE)
        {
            throw new ServiceException("单张图片不能超过5MB");
        }
        byte[] header;
        try (InputStream input = file.getInputStream())
        {
            header = input.readNBytes(8);
        }
        boolean jpeg = header.length >= 3
                && (header[0] & 0xff) == 0xff
                && (header[1] & 0xff) == 0xd8
                && (header[2] & 0xff) == 0xff;
        boolean png = header.length >= 8
                && (header[0] & 0xff) == 0x89
                && header[1] == 0x50
                && header[2] == 0x4e
                && header[3] == 0x47
                && header[4] == 0x0d
                && header[5] == 0x0a
                && header[6] == 0x1a
                && header[7] == 0x0a;
        if (("jpg".equals(extension) || "jpeg".equals(extension)) ? !jpeg : !png)
        {
            throw new ServiceException("图片内容与文件格式不一致");
        }
        ImageReader reader = null;
        try (InputStream rawInput = file.getInputStream();
             ImageInputStream imageInput = ImageIO.createImageInputStream(rawInput))
        {
            if (imageInput == null) throw new ServiceException("无法读取图片内容");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) throw new ServiceException("无法读取图片内容");
            reader = readers.next();
            reader.setInput(imageInput, true, true);
            ShopPlatformMediaPathUtils.requireSafeImageDimensions(
                    reader.getWidth(0), reader.getHeight(0));
        }
        finally
        {
            if (reader != null) reader.dispose();
        }
    }

    private void validateVideo(MultipartFile file) throws Exception
    {
        if (file.getSize() > MAX_VIDEO_SIZE)
        {
            throw new ServiceException("视频不能超过10MB");
        }
        byte[] header;
        try (InputStream input = file.getInputStream())
        {
            header = input.readNBytes(12);
        }
        if (header.length < 12
                || !"ftyp".equals(new String(header, 4, 4, StandardCharsets.US_ASCII)))
        {
            throw new ServiceException("视频文件不是有效的MP4格式");
        }
        Double seconds;
        try (InputStream input = file.getInputStream())
        {
            seconds = findMovieDuration(input, file.getSize());
        }
        if (seconds == null || !Double.isFinite(seconds) || seconds <= 0)
        {
            throw new ServiceException("无法读取视频时长，请重新导出为MP4后上传");
        }
        if (seconds > MAX_VIDEO_SECONDS)
        {
            throw new ServiceException("视频时长不能超过30秒");
        }
    }

    private Double findMovieDuration(InputStream input, long length) throws IOException
    {
        return findMovieDuration(input, length, 0);
    }

    private Double findMovieDuration(InputStream input, long length, int depth) throws IOException
    {
        if (depth > MAX_MP4_BOX_DEPTH) return null;
        long remaining = length;
        while (remaining >= 8)
        {
            byte[] header = input.readNBytes(8);
            if (header.length != 8) return null;
            long boxSize = readUnsignedInt(header, 0);
            long headerSize = 8;
            if (boxSize == 1)
            {
                byte[] extendedSize = input.readNBytes(8);
                if (extendedSize.length != 8) return null;
                boxSize = readLong(extendedSize, 0);
                headerSize = 16;
            }
            else if (boxSize == 0)
            {
                boxSize = remaining;
            }
            if (boxSize < headerSize || boxSize > remaining)
            {
                return null;
            }

            String type = new String(header, 4, 4, StandardCharsets.US_ASCII);
            long payloadSize = boxSize - headerSize;
            if ("mvhd".equals(type))
            {
                return readMovieHeaderDuration(input, payloadSize);
            }
            if ("moov".equals(type))
            {
                Double duration = findMovieDuration(input, payloadSize, depth + 1);
                if (duration != null) return duration;
                return null;
            }
            input.skipNBytes(payloadSize);
            remaining -= boxSize;
        }
        return null;
    }

    private Double readMovieHeaderDuration(InputStream input, long payloadSize) throws IOException
    {
        if (payloadSize < 20) return null;
        byte[] data = input.readNBytes((int) Math.min(payloadSize, 32));
        if (data.length < 20) return null;
        int version = data[0] & 0xff;
        if (version == 0)
        {
            long timescale = readUnsignedInt(data, 12);
            long duration = readUnsignedInt(data, 16);
            return timescale > 0 ? (double) duration / timescale : null;
        }
        if (version == 1 && data.length >= 32)
        {
            long timescale = readUnsignedInt(data, 20);
            long duration = readLong(data, 24);
            return timescale > 0 && duration > 0 ? (double) duration / timescale : null;
        }
        return null;
    }

    private long readUnsignedInt(byte[] data, int offset)
    {
        return ((long) (data[offset] & 0xff) << 24)
                | ((long) (data[offset + 1] & 0xff) << 16)
                | ((long) (data[offset + 2] & 0xff) << 8)
                | (data[offset + 3] & 0xffL);
    }

    private long readLong(byte[] data, int offset)
    {
        return (readUnsignedInt(data, offset) << 32)
                | readUnsignedInt(data, offset + 4);
    }

    private String extension(String fileName)
    {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private boolean isImageExtension(String extension)
    {
        return "jpg".equals(extension) || "jpeg".equals(extension) || "png".equals(extension);
    }
}
