package com.ruoyi.shop.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.ruoyi.common.config.RuoYiConfig;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WechatShareImageServiceTest
{
    @TempDir Path tempDirectory;

    @Test
    void rendersLargePortraitUploadAsLightweightSquareJpeg() throws Exception
    {
        String previousProfile = RuoYiConfig.getProfile();
        try
        {
            new RuoYiConfig().setProfile(tempDirectory.toString());
            Path source = tempDirectory.resolve("upload/product/cover.png");
            Files.createDirectories(source.getParent());
            BufferedImage portrait = new BufferedImage(900, 1700, BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = portrait.createGraphics();
            graphics.setColor(new Color(240, 110, 48, 190));
            graphics.fillRect(0, 0, portrait.getWidth(), portrait.getHeight());
            graphics.dispose();
            ImageIO.write(portrait, "png", source.toFile());

            WechatShareImageService service = new WechatShareImageService();
            byte[] result = service.render("/api/profile/upload/product/cover.png");
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result));

            assertEquals(WechatShareImageService.SHARE_IMAGE_SIZE, decoded.getWidth());
            assertEquals(WechatShareImageService.SHARE_IMAGE_SIZE, decoded.getHeight());
            assertTrue(result.length < 300_000, "share thumbnail should stay below 300 KB");
            assertSame(result, service.render("/profile/upload/product/cover.png"));
        }
        finally
        {
            new RuoYiConfig().setProfile(previousProfile);
        }
    }

    @Test
    void rendersBrandedFallbackWhenStoredCoverIsMissing() throws Exception
    {
        WechatShareImageService service = new WechatShareImageService();
        byte[] result = service.render("/profile/missing/cover.jpg");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result));

        assertEquals(WechatShareImageService.SHARE_IMAGE_SIZE, decoded.getWidth());
        assertEquals(WechatShareImageService.SHARE_IMAGE_SIZE, decoded.getHeight());
        assertTrue(result.length < 300_000, "fallback thumbnail should stay below 300 KB");
    }
}
