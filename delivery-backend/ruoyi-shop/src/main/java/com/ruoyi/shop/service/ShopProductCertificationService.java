package com.ruoyi.shop.service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.shop.ai.ShopProductCertificationProperties;
import com.ruoyi.shop.domain.ShopProduct;
import com.ruoyi.shop.domain.ShopProductCertification;
import com.ruoyi.shop.domain.ShopProductCertificationMaterial;
import com.ruoyi.shop.domain.ShopProductImage;
import com.ruoyi.shop.domain.dto.ShopProductCertificationSubmitBody;
import com.ruoyi.shop.mapper.ShopProductCertificationMapper;
import com.ruoyi.shop.mapper.ShopProductMapper;

@Service
public class ShopProductCertificationService
{
    public static final String PROCESSING = "PROCESSING";
    public static final String PASSED = "PASSED";
    public static final String REJECTED = "REJECTED";
    public static final String EXPIRED = "EXPIRED";
    private static final Set<String> SOURCE_TYPES = Set.of(
            "BRAND_DIRECT", "DISTRIBUTOR", "OWN_BRAND", "OTHER");
    private static final Set<String> MATCH_TYPES = Set.of(
            "MODEL_OR_ITEM_NO", "BARCODE", "PRODUCT_NAME", "PACKAGE_LABEL");
    private static final Set<String> PROOF_TYPES = Set.of(
            "BRAND_AUTHORIZATION", "PURCHASE_CONTRACT", "PURCHASE_INVOICE_OR_ORDER",
            "DELIVERY_OR_WAREHOUSE_RECEIPT", "OWN_PRODUCTION", "OTHER");

    private final ShopProductCertificationMapper certificationMapper;
    private final ShopProductMapper productMapper;
    private final ShopProductCertificationStorageService storageService;
    private final ShopProductCertificationProperties properties;
    private final ObjectMapper objectMapper;

    public ShopProductCertificationService(ShopProductCertificationMapper certificationMapper,
            ShopProductMapper productMapper, ShopProductCertificationStorageService storageService,
            ShopProductCertificationProperties properties, ObjectMapper objectMapper)
    {
        this.certificationMapper = certificationMapper;
        this.productMapper = productMapper;
        this.storageService = storageService;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ShopProductCertification latest(long merchantId, long productId)
    {
        requireMerchantProduct(merchantId, productId);
        ShopProductCertification certification = certificationMapper.selectLatestForMerchant(merchantId, productId);
        if (certification == null) return null;
        expireIfNecessary(certification);
        certification = certificationMapper.selectLatestForMerchant(merchantId, productId);
        certification.setMaterials(certificationMapper.selectMaterials(certification.getCertificationId()));
        return certification;
    }

    @Transactional
    public ShopProductCertification submit(long merchantId, long productId,
            ShopProductCertificationSubmitBody body, String operator)
    {
        if (!properties.isEnabled())
        {
            throw new ServiceException("平台AI认证功能暂未开启");
        }
        ShopProduct product = requireMerchantProduct(merchantId, productId);
        validateEnums(body);
        ShopProductCertification current = certificationMapper.selectCurrentForProduct(merchantId, productId);
        if (current != null && PROCESSING.equals(current.getStatus()))
        {
            throw new ServiceException("该商品的平台AI认证正在处理中，请勿重复提交");
        }
        if (current != null && PASSED.equals(current.getStatus()))
        {
            expireIfNecessary(current);
            current = certificationMapper.selectCurrentForProduct(merchantId, productId);
            if (current != null && PASSED.equals(current.getStatus()))
            {
                throw new ServiceException("该商品的平台AI认证仍在有效期内");
            }
        }
        ShopProductCertification latest = certificationMapper.selectLatestForMerchant(merchantId, productId);
        int version = latest == null ? 1 : latest.getVersionNo() + 1;
        MaterialSelection proof = materialSelection(latest, merchantId, productId,
                ShopProductCertificationStorageService.PROOF, body.getProofFile(),
                body.getRetainedProofMaterialId(), body.getProofType());
        MaterialSelection front = materialSelection(latest, merchantId, productId,
                ShopProductCertificationStorageService.PRODUCT_FRONT, body.getFrontPhoto(),
                body.getRetainedFrontMaterialId(), ShopProductCertificationStorageService.PRODUCT_FRONT);
        MaterialSelection label = materialSelection(latest, merchantId, productId,
                ShopProductCertificationStorageService.PACKAGE_LABEL, body.getLabelPhoto(),
                body.getRetainedLabelMaterialId(), ShopProductCertificationStorageService.PACKAGE_LABEL);

        String snapshot = buildProductSnapshot(product);
        certificationMapper.clearCurrent(merchantId, productId);
        ShopProductCertification certification = new ShopProductCertification();
        certification.setCertificationNo(generateCertificationNo());
        certification.setMerchantId(merchantId);
        certification.setProductId(productId);
        certification.setVersionNo(version);
        certification.setStatus(PROCESSING);
        certification.setSourceType(body.getSourceType().trim());
        certification.setSupplierName(body.getSupplierName().trim());
        certification.setOriginPlace(body.getOriginPlace().trim());
        certification.setShippingPlace(body.getShippingPlace().trim());
        certification.setMatchType(body.getMatchType().trim());
        certification.setMatchValue(body.getMatchValue().trim());
        certification.setProofType(body.getProofType().trim());
        certification.setDeclarationConfirmed("1");
        certification.setProductSnapshot(snapshot);
        certification.setCreateBy(operator);
        certification.setUpdateBy(operator);
        certificationMapper.insertCertification(certification);

        List<ShopProductCertificationMaterial> materials = new ArrayList<>();
        materials.add(persistSelection(proof, certification, 1));
        materials.add(persistSelection(front, certification, 1));
        materials.add(persistSelection(label, certification, 1));
        String inputHash = buildInputHash(certification, materials);
        certificationMapper.updateInputHash(certification.getCertificationId(), inputHash);
        certificationMapper.insertLog(certification.getCertificationId(), certification.getTenantId(),
                merchantId, productId, "SUBMITTED", latest == null ? null : latest.getStatus(),
                PROCESSING, "商家提交平台AI认证申请", inputHash, null, null, null,
                "MERCHANT", operator);
        return latest(merchantId, productId);
    }

    public ShopProductCertificationMaterial material(long merchantId, long productId, long materialId)
    {
        requireMerchantProduct(merchantId, productId);
        ShopProductCertificationMaterial material = certificationMapper.selectMaterialForMerchant(
                merchantId, productId, materialId);
        if (material == null) throw new ServiceException("认证材料不存在或无权访问");
        return material;
    }

    public Path materialPath(ShopProductCertificationMaterial material)
    {
        return storageService.resolvePrivatePath(material);
    }

    @Transactional
    public void invalidateForCriticalProductChange(long merchantId, long productId, String operator)
    {
        ShopProductCertification current = certificationMapper.selectCurrentForProduct(merchantId, productId);
        if (current == null || (!PROCESSING.equals(current.getStatus()) && !PASSED.equals(current.getStatus()))) return;
        if (certificationMapper.expireForProductChange(merchantId, productId, operator) > 0)
        {
            certificationMapper.insertLog(current.getCertificationId(), current.getTenantId(), merchantId,
                    productId, "EXPIRED", current.getStatus(), EXPIRED,
                    "商品名称、品牌、分类或商品图片发生变化", current.getInputHash(),
                    current.getAiProvider(), current.getAiModel(), current.getPromptVersion(),
                    "SYSTEM", operator);
        }
    }

    private MaterialSelection materialSelection(ShopProductCertification latest, long merchantId,
            long productId, String kind, MultipartFile file, Long retainedId, String materialType)
    {
        if (file != null && !file.isEmpty()) return new MaterialSelection(kind, file, null, materialType);
        if (latest != null && retainedId != null)
        {
            ShopProductCertificationMaterial retained = certificationMapper.selectReusableMaterial(
                    latest.getCertificationId(), merchantId, productId, retainedId, kind);
            if (retained != null) return new MaterialSelection(kind, null, retained, materialType);
        }
        String message = switch (kind)
        {
            case ShopProductCertificationStorageService.PROOF -> "请上传或保留供货证明";
            case ShopProductCertificationStorageService.PRODUCT_FRONT -> "请上传或保留商品正面照片";
            default -> "请上传或保留包装、标签或条形码照片";
        };
        throw new ServiceException(message);
    }

    private ShopProductCertificationMaterial persistSelection(MaterialSelection selection,
            ShopProductCertification certification, int sort)
    {
        ShopProductCertificationMaterial material;
        if (selection.file() != null)
        {
            material = storageService.store(selection.file(), selection.kind(), selection.materialType(),
                    certification.getCertificationId(), certification.getMerchantId(), certification.getProductId());
            ShopProductCertificationMaterial stored = material;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization()
            {
                @Override
                public void afterCompletion(int status)
                {
                    if (status != TransactionSynchronization.STATUS_COMMITTED)
                    {
                        storageService.deleteQuietly(stored);
                    }
                }
            });
        }
        else
        {
            ShopProductCertificationMaterial retained = selection.retained();
            material = new ShopProductCertificationMaterial();
            material.setTenantId(retained.getTenantId());
            material.setCertificationId(certification.getCertificationId());
            material.setMerchantId(certification.getMerchantId());
            material.setProductId(certification.getProductId());
            material.setMaterialKind(retained.getMaterialKind());
            material.setMaterialType(selection.materialType());
            material.setOriginalName(retained.getOriginalName());
            material.setStoragePath(retained.getStoragePath());
            material.setContentType(retained.getContentType());
            material.setFileExtension(retained.getFileExtension());
            material.setSizeBytes(retained.getSizeBytes());
            material.setSha256(retained.getSha256());
            material.setPageCount(retained.getPageCount());
        }
        material.setCertificationId(certification.getCertificationId());
        material.setMaterialSort(sort);
        certificationMapper.insertMaterial(material);
        return material;
    }

    private ShopProduct requireMerchantProduct(long merchantId, long productId)
    {
        ShopProduct product = productMapper.selectMerchantProduct(merchantId, productId);
        if (product == null) throw new ServiceException("商品不存在或不属于当前商家");
        product.setImages(productMapper.selectImages(productId));
        return product;
    }

    private void validateEnums(ShopProductCertificationSubmitBody body)
    {
        if (!SOURCE_TYPES.contains(body.getSourceType())) throw new ServiceException("商品来源无效");
        if (!MATCH_TYPES.contains(body.getMatchType())) throw new ServiceException("商品核对方式无效");
        if (!PROOF_TYPES.contains(body.getProofType())) throw new ServiceException("供货证明类型无效");
        if (!Boolean.TRUE.equals(body.getDeclarationConfirmed()))
        {
            throw new ServiceException("请确认信息和材料真实有效并同意平台处理");
        }
    }

    private String buildProductSnapshot(ShopProduct product)
    {
        try
        {
            List<Map<String, Object>> images = new ArrayList<>();
            if (product.getImages() != null)
            {
                product.getImages().stream()
                        .sorted(Comparator.comparing(ShopProductImage::getImageId))
                        .forEach(image ->
                        {
                            Map<String, Object> imageSnapshot = new LinkedHashMap<>();
                            imageSnapshot.put("imageType", image.getImageType());
                            imageSnapshot.put("imageUrl", image.getImageUrl());
                            images.add(imageSnapshot);
                        });
            }
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("productId", product.getProductId());
            snapshot.put("merchantId", product.getMerchantId());
            snapshot.put("categoryId", product.getCategoryId());
            snapshot.put("categoryCode", product.getCategoryCode());
            snapshot.put("brandName", product.getBrandName());
            snapshot.put("productName", product.getProductName());
            snapshot.put("coverUrl", product.getCoverUrl());
            snapshot.put("images", images);
            return objectMapper.writeValueAsString(snapshot);
        }
        catch (Exception exception)
        {
            throw new ServiceException("商品认证快照生成失败");
        }
    }

    private String buildInputHash(ShopProductCertification certification,
            List<ShopProductCertificationMaterial> materials)
    {
        StringBuilder input = new StringBuilder(certification.getProductSnapshot())
                .append('|').append(certification.getSourceType())
                .append('|').append(certification.getSupplierName())
                .append('|').append(certification.getOriginPlace())
                .append('|').append(certification.getShippingPlace())
                .append('|').append(certification.getMatchType())
                .append('|').append(certification.getMatchValue())
                .append('|').append(certification.getProofType());
        materials.stream().sorted(Comparator.comparing(ShopProductCertificationMaterial::getMaterialKind))
                .forEach(material -> input.append('|').append(material.getMaterialKind())
                        .append(':').append(material.getSha256()));
        return sha256(input.toString());
    }

    private void expireIfNecessary(ShopProductCertification certification)
    {
        if (PASSED.equals(certification.getStatus()) && certification.getExpiresAt() != null
                && !certification.getExpiresAt().after(new Date())
                && certificationMapper.expirePassedById(certification.getCertificationId()) > 0)
        {
            certificationMapper.insertLog(certification.getCertificationId(), certification.getTenantId(),
                    certification.getMerchantId(), certification.getProductId(), "EXPIRED", PASSED, EXPIRED,
                    "平台AI认证已到有效期", certification.getInputHash(), certification.getAiProvider(),
                    certification.getAiModel(), certification.getPromptVersion(), "SYSTEM", "expiry-check");
        }
    }

    private String generateCertificationNo()
    {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String random = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "ZK-" + date + "-" + random;
    }

    private String sha256(String value)
    {
        try
        {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        }
        catch (Exception exception)
        {
            throw new IllegalStateException("当前JVM不支持SHA-256", exception);
        }
    }

    private record MaterialSelection(String kind,
                                     MultipartFile file,
                                     ShopProductCertificationMaterial retained,
                                     String materialType) { }
}
