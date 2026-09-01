package com.ruoyi.shop.payment;

import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.util.ShopPlatformMediaPathUtils;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.stereotype.Service;

/** Builds a small, square and same-origin JPEG for WeChat share cards. */
@Service
public class WechatShareImageService
{
    static final int SHARE_IMAGE_SIZE = 360;
    private static final int CACHE_LIMIT = 128;
    private final Map<String, byte[]> cache = Collections.synchronizedMap(
            new LinkedHashMap<>(32, 0.75f, true)
            {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest)
                {
                    return size() > CACHE_LIMIT;
                }
            });

    public byte[] render(String source)
    {
        try
        {
            Path imagePath = ShopPlatformMediaPathUtils.resolveStoredImagePath(source);
            String cacheKey = cacheKey(imagePath);
            byte[] cached = cache.get(cacheKey);
            if (cached != null) return cached;
            BufferedImage cropped = readSquare(imagePath);
            BufferedImage thumbnail = resize(cropped);
            byte[] rendered = encodeJpeg(thumbnail);
            cache.put(cacheKey, rendered);
            return rendered;
        }
        catch (ServiceException exception)
        {
            return fallbackImage();
        }
    }

    private byte[] fallbackImage()
    {
        byte[] cached = cache.get("fallback");
        if (cached != null) return cached;
        BufferedImage image = new BufferedImage(
                SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try
        {
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                    RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.setColor(new Color(245, 242, 236));
            graphics.fillRect(0, 0, SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE);
            graphics.setColor(new Color(138, 63, 50));
            graphics.fillRoundRect(42, 42, 276, 276, 72, 72);
            graphics.setColor(new Color(255, 253, 248));
            graphics.fillOval(98, 82, 164, 164);
            graphics.fillRoundRect(142, 215, 76, 58, 24, 24);
            graphics.setColor(new Color(138, 63, 50));
            graphics.fillOval(139, 123, 82, 82);
        }
        finally
        {
            graphics.dispose();
        }
        byte[] rendered = encodeJpeg(image);
        cache.put("fallback", rendered);
        return rendered;
    }

    private String cacheKey(Path imagePath)
    {
        try
        {
            return imagePath + ":" + Files.size(imagePath) + ":"
                    + Files.getLastModifiedTime(imagePath).toMillis();
        }
        catch (Exception exception)
        {
            throw invalidImage();
        }
    }

    private BufferedImage readSquare(Path imagePath)
    {
        ImageReader reader = null;
        try (ImageInputStream input = ImageIO.createImageInputStream(imagePath.toFile()))
        {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            reader = readers.next();
            reader.setInput(input, true, true);
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            ShopPlatformMediaPathUtils.requireSafeImageDimensions(width, height);

            int side = Math.min(width, height);
            int sampling = Math.max(1, side / SHARE_IMAGE_SIZE);
            ImageReadParam parameters = reader.getDefaultReadParam();
            parameters.setSourceRegion(new java.awt.Rectangle(
                    Math.max(0, (width - side) / 2),
                    Math.max(0, (height - side) / 2),
                    side,
                    side));
            parameters.setSourceSubsampling(sampling, sampling, 0, 0);
            BufferedImage image = reader.read(0, parameters);
            if (image == null) throw invalidImage();
            return image;
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            throw invalidImage();
        }
        finally
        {
            if (reader != null) reader.dispose();
        }
    }

    private BufferedImage resize(BufferedImage source)
    {
        BufferedImage target = new BufferedImage(
                SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = target.createGraphics();
        try
        {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING,
                    RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(source, 0, 0, SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE, null);
        }
        finally
        {
            graphics.dispose();
        }
        return target;
    }

    private byte[] encodeJpeg(BufferedImage image)
    {
        ImageWriter writer = null;
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                ImageOutputStream output = ImageIO.createImageOutputStream(bytes))
        {
            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (!writers.hasNext()) throw invalidImage();
            writer = writers.next();
            writer.setOutput(output);
            ImageWriteParam parameters = writer.getDefaultWriteParam();
            if (parameters.canWriteCompressed())
            {
                parameters.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                parameters.setCompressionQuality(0.82f);
            }
            writer.write(null, new IIOImage(image, null, null), parameters);
            output.flush();
            return bytes.toByteArray();
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            throw invalidImage();
        }
        finally
        {
            if (writer != null) writer.dispose();
        }
    }

    private ServiceException invalidImage()
    {
        return new ServiceException("微信分享图片生成失败");
    }
}
