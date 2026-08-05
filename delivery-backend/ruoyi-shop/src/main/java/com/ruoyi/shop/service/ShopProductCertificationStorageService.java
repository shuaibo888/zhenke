package com.ruoyi.shop.service;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.ruoyi.common.config.RuoYiConfig;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.ai.ShopProductCertificationProperties;
import com.ruoyi.shop.domain.ShopProductCertificationMaterial;

@Service
public class ShopProductCertificationStorageService
{
    public static final String PROOF = "PROOF";
    public static final String PRODUCT_FRONT = "PRODUCT_FRONT";
    public static final String PACKAGE_LABEL = "PACKAGE_LABEL";
    private static final long MAX_PROOF_SIZE = 10 * 1024 * 1024L;
    private static final long MAX_PHOTO_SIZE = 5 * 1024 * 1024L;
    private static final int MAX_PDF_PAGES = 10;
    private static final long MAX_IMAGE_PIXELS = 50_000_000L;
    private static final int MAX_IMAGE_SIDE = 12_000;
    private static final int PDF_RENDER_DPI = 120;
    private static final int MAX_RENDERED_PDF_SIDE = 4_096;

    private final Path storageRoot;

    public ShopProductCertificationStorageService(ShopProductCertificationProperties properties)
    {
        Path publicProfile = Path.of(RuoYiConfig.getProfile()).toAbsolutePath().normalize();
        String configured = StringUtils.trim(properties.getStoragePath());
        if (StringUtils.isNotEmpty(configured))
        {
            storageRoot = Path.of(configured).toAbsolutePath().normalize();
        }
        else
        {
            storageRoot = publicProfile.resolveSibling("private")
                    .resolve("product-certification").normalize();
        }
        if (storageRoot.startsWith(publicProfile))
        {
            throw new IllegalStateException("商品认证私有存储目录不能位于公开profile目录内");
        }
    }

    public ShopProductCertificationMaterial store(MultipartFile file, String materialKind,
            String materialType, Long certificationId, Long merchantId, Long productId)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException(requiredMessage(materialKind));
        }
        boolean proof = PROOF.equals(materialKind);
        long maxSize = proof ? MAX_PROOF_SIZE : MAX_PHOTO_SIZE;
        if (file.getSize() > maxSize)
        {
            throw new ServiceException(proof ? "供货证明文件不能超过10MB" : "单张商品实拍照片不能超过5MB");
        }
        String extension = extension(file.getOriginalFilename());
        if (!isImageExtension(extension) && !(proof && "pdf".equals(extension)))
        {
            throw new ServiceException(proof ? "供货证明仅支持 JPG、PNG、PDF" : "商品实拍照片仅支持 JPG、PNG");
        }
        try
        {
            byte[] bytes = file.getBytes();
            FileInspection inspection = "pdf".equals(extension)
                    ? inspectPdf(bytes) : inspectImage(bytes, extension);
            Path directory = storageRoot.resolve("unscoped")
                    .resolve("merchant-" + merchantId)
                    .resolve("product-" + productId)
                    .resolve("certification-" + certificationId).normalize();
            requireInsideRoot(directory);
            Files.createDirectories(directory);
            String storedName = UUID.randomUUID().toString().replace("-", "") + "." + inspection.extension();
            Path target = directory.resolve(storedName).normalize();
            requireInsideRoot(target);
            Files.write(target, bytes, StandardOpenOption.CREATE_NEW);

            ShopProductCertificationMaterial material = new ShopProductCertificationMaterial();
            material.setCertificationId(certificationId);
            material.setMerchantId(merchantId);
            material.setProductId(productId);
            material.setMaterialKind(materialKind);
            material.setMaterialType(materialType);
            material.setOriginalName(safeOriginalName(file.getOriginalFilename(), inspection.extension()));
            material.setStoragePath(storageRoot.relativize(target).toString().replace('\\', '/'));
            material.setContentType(inspection.contentType());
            material.setFileExtension(inspection.extension());
            material.setSizeBytes((long) bytes.length);
            material.setSha256(sha256(bytes));
            material.setPageCount(inspection.pageCount());
            material.setMaterialSort(1);
            return material;
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            throw new ServiceException("认证材料保存失败，请重新选择文件");
        }
    }

    public Path resolvePrivatePath(ShopProductCertificationMaterial material)
    {
        if (material == null || StringUtils.isEmpty(material.getStoragePath()))
        {
            throw new ServiceException("认证材料不存在");
        }
        Path path = storageRoot.resolve(material.getStoragePath()).normalize();
        requireInsideRoot(path);
        if (!Files.isRegularFile(path))
        {
            throw new ServiceException("认证材料文件不存在");
        }
        return path;
    }

    public byte[] readBytes(ShopProductCertificationMaterial material)
    {
        try
        {
            return Files.readAllBytes(resolvePrivatePath(material));
        }
        catch (ServiceException exception)
        {
            throw exception;
        }
        catch (Exception exception)
        {
            throw new ServiceException("认证材料读取失败");
        }
    }

    public void deleteQuietly(ShopProductCertificationMaterial material)
    {
        try
        {
            Files.deleteIfExists(resolvePrivatePath(material));
        }
        catch (Exception ignored)
        {
        }
    }

    private FileInspection inspectImage(byte[] bytes, String extension) throws Exception
    {
        try (ImageInputStream imageInput = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes)))
        {
            if (imageInput == null) throw new ServiceException("无法读取图片内容");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) throw new ServiceException("仅支持有效的 JPG、PNG 图片");
            ImageReader reader = readers.next();
            try
            {
                reader.setInput(imageInput, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                boolean jpeg = ("jpg".equals(extension) || "jpeg".equals(extension))
                        && ("jpg".equals(format) || "jpeg".equals(format));
                boolean png = "png".equals(extension) && "png".equals(format);
                if (!jpeg && !png) throw new ServiceException("图片内容与文件格式不一致");
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE
                        || (long) width * height > MAX_IMAGE_PIXELS)
                {
                    throw new ServiceException("图片像素尺寸过大，请压缩后重新上传");
                }
                return new FileInspection(jpeg ? "jpg" : "png", jpeg ? "image/jpeg" : "image/png", 1);
            }
            finally
            {
                reader.dispose();
            }
        }
    }

    private FileInspection inspectPdf(byte[] bytes) throws Exception
    {
        if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F')
        {
            throw new ServiceException("PDF文件内容与扩展名不一致");
        }
        try (PDDocument document = Loader.loadPDF(bytes))
        {
            if (document.isEncrypted()) throw new ServiceException("暂不支持加密PDF，请解除密码后重新上传");
            int pages = document.getNumberOfPages();
            if (pages < 1 || pages > MAX_PDF_PAGES)
            {
                throw new ServiceException("供货证明PDF页数必须为1至10页");
            }
            for (int page = 0; page < pages; page++)
            {
                PDRectangle box = document.getPage(page).getCropBox();
                double renderedWidth = box.getWidth() * PDF_RENDER_DPI / 72D;
                double renderedHeight = box.getHeight() * PDF_RENDER_DPI / 72D;
                if (renderedWidth > MAX_RENDERED_PDF_SIDE || renderedHeight > MAX_RENDERED_PDF_SIDE)
                {
                    throw new ServiceException("PDF页面尺寸过大，请调整页面后重新上传");
                }
            }
            return new FileInspection("pdf", "application/pdf", pages);
        }
    }

    private void requireInsideRoot(Path path)
    {
        if (!path.toAbsolutePath().normalize().startsWith(storageRoot))
        {
            throw new ServiceException("认证材料路径无效");
        }
    }

    private String requiredMessage(String kind)
    {
        return switch (kind)
        {
            case PROOF -> "请上传供货证明";
            case PRODUCT_FRONT -> "请上传商品正面照片";
            case PACKAGE_LABEL -> "请上传包装、标签或条形码照片";
            default -> "请选择认证材料";
        };
    }

    private String safeOriginalName(String fileName, String extension)
    {
        String name = fileName == null ? "认证材料." + extension : Path.of(fileName).getFileName().toString();
        name = name.replaceAll("[\\r\\n\\p{Cntrl}]", "_").trim();
        return name.length() <= 255 ? name : name.substring(0, 240) + "." + extension;
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

    private String sha256(byte[] bytes) throws Exception
    {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    private record FileInspection(String extension, String contentType, int pageCount) { }
}
