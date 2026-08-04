package com.ruoyi.shop.service;

import java.util.Iterator;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.file.FileUploadUtils;

@Service
public class ShopProductImageResourceService
{
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024L;
    private static final String[] IMAGE_EXTENSIONS = { "jpg", "jpeg", "png" };

    public String upload(MultipartFile file, String kind, long merchantId)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("请选择要上传的商品图片");
        }
        String normalizedKind = kind == null ? "" : kind.trim().toUpperCase(Locale.ROOT);
        if (!"COVER".equals(normalizedKind) && !"MAIN".equals(normalizedKind)
                && !"DETAIL".equals(normalizedKind))
        {
            throw new ServiceException("商品图片类型无效");
        }
        if (file.getSize() > MAX_IMAGE_SIZE)
        {
            throw new ServiceException("单张商品图片不能超过5MB");
        }
        String extension = extension(file.getOriginalFilename());
        if (!"jpg".equals(extension) && !"jpeg".equals(extension) && !"png".equals(extension))
        {
            throw new ServiceException("仅支持 JPG、PNG 图片");
        }
        try
        {
            try (ImageInputStream imageInput = ImageIO.createImageInputStream(file.getInputStream()))
            {
                if (imageInput == null)
                {
                    throw new ServiceException("无法读取图片内容");
                }
                Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
                if (!readers.hasNext())
                {
                    throw new ServiceException("仅支持有效的 JPG、PNG 图片");
                }
                ImageReader reader = readers.next();
                try
                {
                    reader.setInput(imageInput, true, true);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    boolean jpegMatches = ("jpg".equals(extension) || "jpeg".equals(extension))
                            && ("jpg".equals(format) || "jpeg".equals(format));
                    boolean pngMatches = "png".equals(extension) && "png".equals(format);
                    if (!jpegMatches && !pngMatches)
                    {
                        throw new ServiceException("图片内容与文件格式不一致");
                    }
                }
                finally
                {
                    reader.dispose();
                }
            }
            return FileUploadUtils.upload(
                    RuoYiConfig.getUploadPath() + "/product/merchant-" + merchantId,
                    file,
                    IMAGE_EXTENSIONS,
                    true);
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            throw new ServiceException("商品图片上传失败，请重新选择图片");
        }
    }

    private String extension(String fileName)
    {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

}
