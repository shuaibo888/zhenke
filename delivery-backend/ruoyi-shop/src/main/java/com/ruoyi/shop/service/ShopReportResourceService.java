package com.ruoyi.shop.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.file.FileUploadUtils;
import com.ruoyi.shop.security.ShopAccountIdentity;

@Service
public class ShopReportResourceService
{
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024L;
    private static final long MAX_VIDEO_SIZE = 10 * 1024 * 1024L;
    private static final double MAX_VIDEO_SECONDS = 30D;
    private static final String[] IMAGE_EXTENSIONS = { "jpg", "jpeg", "png" };
    private static final String[] VIDEO_EXTENSIONS = { "mp4" };

    public String upload(MultipartFile file)
    {
        ShopAccountIdentity.requireShopUserId();
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
                return FileUploadUtils.upload(
                        RuoYiConfig.getUploadPath(), file, IMAGE_EXTENSIONS, true);
            }
            if ("mp4".equals(extension))
            {
                validateVideo(file);
                return FileUploadUtils.upload(
                        RuoYiConfig.getUploadPath(), file, VIDEO_EXTENSIONS, true);
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

    private void validateImage(MultipartFile file, String extension) throws Exception
    {
        if (file.getSize() > MAX_IMAGE_SIZE)
        {
            throw new ServiceException("单张图片不能超过5MB");
        }
        byte[] header = file.getInputStream().readNBytes(8);
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
    }

    private void validateVideo(MultipartFile file) throws Exception
    {
        if (file.getSize() > MAX_VIDEO_SIZE)
        {
            throw new ServiceException("视频不能超过10MB");
        }
        byte[] content = file.getBytes();
        if (content.length < 12
                || !"ftyp".equals(new String(content, 4, 4, StandardCharsets.US_ASCII)))
        {
            throw new ServiceException("视频文件不是有效的MP4格式");
        }
        Double seconds = findMovieDuration(content, 0, content.length);
        if (seconds == null || !Double.isFinite(seconds) || seconds <= 0)
        {
            throw new ServiceException("无法读取视频时长，请重新导出为MP4后上传");
        }
        if (seconds > MAX_VIDEO_SECONDS)
        {
            throw new ServiceException("视频时长不能超过30秒");
        }
    }

    private Double findMovieDuration(byte[] data, int start, int end)
    {
        int position = start;
        while (position + 8 <= end)
        {
            long boxSize = readUnsignedInt(data, position);
            int headerSize = 8;
            if (boxSize == 1)
            {
                if (position + 16 > end) return null;
                boxSize = readLong(data, position + 8);
                headerSize = 16;
            }
            else if (boxSize == 0)
            {
                boxSize = end - position;
            }
            if (boxSize < headerSize || boxSize > end - position || boxSize > Integer.MAX_VALUE)
            {
                return null;
            }

            String type = new String(data, position + 4, 4, StandardCharsets.US_ASCII);
            int payloadStart = position + headerSize;
            int boxEnd = position + (int) boxSize;
            if ("mvhd".equals(type))
            {
                return readMovieHeaderDuration(data, payloadStart, boxEnd);
            }
            if ("moov".equals(type))
            {
                Double duration = findMovieDuration(data, payloadStart, boxEnd);
                if (duration != null) return duration;
            }
            position = boxEnd;
        }
        return null;
    }

    private Double readMovieHeaderDuration(byte[] data, int start, int end)
    {
        if (start + 20 > end) return null;
        int version = data[start] & 0xff;
        if (version == 0)
        {
            long timescale = readUnsignedInt(data, start + 12);
            long duration = readUnsignedInt(data, start + 16);
            return timescale > 0 ? (double) duration / timescale : null;
        }
        if (version == 1 && start + 32 <= end)
        {
            long timescale = readUnsignedInt(data, start + 20);
            long duration = readLong(data, start + 24);
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
