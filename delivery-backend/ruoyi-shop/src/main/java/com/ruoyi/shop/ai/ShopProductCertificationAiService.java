package com.ruoyi.shop.ai;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.MimeTypeUtils;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.shop.domain.ShopProductCertification;
import com.ruoyi.shop.domain.ShopProductCertificationMaterial;
import com.ruoyi.shop.domain.dto.ShopProductCertificationAiResult;
import com.ruoyi.shop.mapper.ShopProductCertificationMapper;
import com.ruoyi.shop.service.ShopProductCertificationService;
import com.ruoyi.shop.service.ShopProductCertificationStorageService;

@Service
public class ShopProductCertificationAiService
{
    private static final Logger log = LoggerFactory.getLogger(ShopProductCertificationAiService.class);
    private static final Set<String> RESULT_FIELDS = Set.of("decision", "confidence", "matchedFields",
            "missingFields", "riskFlags", "merchantReason", "publicSummary", "materialValidUntil");
    private final ShopProductCertificationMapper certificationMapper;
    private final ShopProductCertificationStorageService storageService;
    private final ShopProductCertificationProperties properties;
    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    public ShopProductCertificationAiService(ShopProductCertificationMapper certificationMapper,
            ShopProductCertificationStorageService storageService,
            ShopProductCertificationProperties properties, ChatModel chatModel,
            ObjectMapper objectMapper, PlatformTransactionManager transactionManager)
    {
        this.certificationMapper = certificationMapper;
        this.storageService = storageService;
        this.properties = properties;
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void processBatch()
    {
        if (!properties.isEnabled()) return;
        expirePassed();
        Date now = new Date();
        Date staleBefore = Date.from(now.toInstant().minusSeconds(
                Math.max(1, properties.getRunningTimeoutMinutes()) * 60L));
        List<Long> ids = certificationMapper.selectProcessingCandidates(
                Math.max(1, Math.min(properties.getBatchSize(), 20)), staleBefore);
        for (Long certificationId : ids)
        {
            if (certificationMapper.claimProcessing(certificationId, new Date(), staleBefore,
                    AiModelMetadata.PROVIDER, properties.getModel(), properties.getPromptVersion()) == 0)
            {
                continue;
            }
            processClaimed(certificationId);
        }
    }

    private void processClaimed(Long certificationId)
    {
        ShopProductCertification certification = certificationMapper.selectForProcessing(certificationId);
        if (certification == null) return;
        certificationMapper.insertLog(certificationId, certification.getTenantId(),
                certification.getMerchantId(), certification.getProductId(), "AI_STARTED",
                ShopProductCertificationService.PROCESSING, ShopProductCertificationService.PROCESSING,
                "平台AI开始识别认证材料", certification.getInputHash(), AiModelMetadata.PROVIDER,
                properties.getModel(), properties.getPromptVersion(), "AI", "product-certification-ai");
        try
        {
            List<ShopProductCertificationMaterial> materials = certificationMapper.selectMaterials(certificationId);
            if (materials.size() != 3) throw new IllegalArgumentException("认证材料数量不完整");
            ModelInput modelInput = buildModelInput(certification, materials);
            UserMessage userMessage = UserMessage.builder()
                    .text(modelInput.prompt()).media(modelInput.media()).build();
            Prompt prompt = new Prompt(List.of(
                    new SystemMessage(AiPrompts.PRODUCT_CERTIFICATION_SYSTEM), userMessage),
                    DashScopeChatOptions.builder()
                            .model(properties.getModel())
                            .multiModel(true)
                            .build());
            ChatResponse response = chatModel.call(prompt);
            String raw = response == null || response.getResult() == null
                    ? null : response.getResult().getOutput().getText();
            ValidatedResult result = validate(parseStrictResult(raw));
            complete(certification, result);
        }
        catch (Exception exception)
        {
            scheduleRetry(certification, exception);
        }
    }

    private ModelInput buildModelInput(ShopProductCertification certification,
            List<ShopProductCertificationMaterial> materials) throws Exception
    {
        List<Media> media = new ArrayList<>();
        StringBuilder manifest = new StringBuilder();
        int mediaIndex = 1;
        for (ShopProductCertificationMaterial material : materials)
        {
            byte[] bytes = storageService.readBytes(material);
            if ("pdf".equals(material.getFileExtension()))
            {
                try (PDDocument document = Loader.loadPDF(bytes))
                {
                    PDFRenderer renderer = new PDFRenderer(document);
                    renderer.setSubsamplingAllowed(true);
                    for (int page = 0; page < document.getNumberOfPages(); page++)
                    {
                        BufferedImage image = renderer.renderImageWithDPI(page, 120, ImageType.RGB);
                        ByteArrayOutputStream output = new ByteArrayOutputStream();
                        ImageIO.write(image, "png", output);
                        media.add(new Media(MimeTypeUtils.IMAGE_PNG,
                                new NamedByteArrayResource(output.toByteArray(),
                                        "proof-page-" + (page + 1) + ".png")));
                        manifest.append(mediaIndex++).append("=供货证明PDF第").append(page + 1).append("页；");
                        image.flush();
                    }
                }
            }
            else
            {
                boolean png = "png".equals(material.getFileExtension());
                media.add(new Media(png ? MimeTypeUtils.IMAGE_PNG : MimeTypeUtils.parseMimeType("image/jpeg"),
                        new NamedByteArrayResource(bytes, material.getOriginalName())));
                manifest.append(mediaIndex++).append('=').append(material.getMaterialKind()).append('；');
            }
        }
        String prompt = AiPrompts.productCertificationUser(certification.getProductSnapshot(),
                json(certification.getSourceType()), json(certification.getSupplierName()),
                json(certification.getOriginPlace()), json(certification.getShippingPlace()),
                json(certification.getMatchType()), json(certification.getMatchValue()),
                json(certification.getProofType()), manifest.toString());
        return new ModelInput(prompt, media);
    }

    private ShopProductCertificationAiResult parseStrictResult(String raw)
    {
        if (raw == null || raw.isBlank()) throw new IllegalArgumentException("平台AI认证结果为空");
        try
        {
            JsonNode root = objectMapper.readTree(raw);
            if (!root.isObject()) throw new IllegalArgumentException("平台AI认证结果必须是JSON对象");
            Set<String> actual = new LinkedHashSet<>();
            root.fieldNames().forEachRemaining(actual::add);
            if (!actual.equals(RESULT_FIELDS))
            {
                throw new IllegalArgumentException("平台AI认证结果字段不符合约定");
            }
            return objectMapper.treeToValue(root, ShopProductCertificationAiResult.class);
        }
        catch (JsonProcessingException exception)
        {
            throw new IllegalArgumentException("平台AI认证结果不是符合约定的JSON对象", exception);
        }
    }

    private ValidatedResult validate(ShopProductCertificationAiResult result)
    {
        if (result == null || result.decision() == null || result.confidence() == null)
        {
            throw new IllegalArgumentException("平台AI认证结果缺少必填字段");
        }
        BigDecimal confidence = result.confidence();
        if (confidence.compareTo(BigDecimal.ZERO) < 0 || confidence.compareTo(BigDecimal.ONE) > 0)
        {
            throw new IllegalArgumentException("平台AI认证置信度超出范围");
        }
        List<String> matched = sanitizeList(result.matchedFields(), "matchedFields");
        List<String> missing = sanitizeList(result.missingFields(), "missingFields");
        List<String> risks = sanitizeList(result.riskFlags(), "riskFlags");
        String merchantReason = sanitizeText(result.merchantReason(), "商家原因", 500);
        String publicSummary = sanitizeText(result.publicSummary(), "公开摘要", 500);
        LocalDate validUntil = parseDate(result.materialValidUntil());
        if (result.decision() == ShopProductCertificationAiResult.Decision.PASS
                && validUntil != null && validUntil.isBefore(LocalDate.now()))
        {
            throw new IllegalArgumentException("平台AI返回PASS但材料有效期已经结束");
        }
        return new ValidatedResult(result.decision(), confidence.setScale(4, RoundingMode.HALF_UP),
                matched, missing, risks, merchantReason, publicSummary, validUntil);
    }

    private void complete(ShopProductCertification certification, ValidatedResult result) throws Exception
    {
        boolean passed = result.decision() == ShopProductCertificationAiResult.Decision.PASS;
        Date passedAt = passed ? new Date() : null;
        Date defaultExpiry = passed ? Date.from(LocalDateTime.of(
                LocalDate.now().plusDays(Math.max(1, properties.getValidityDays())), LocalTime.MAX)
                .atZone(ZoneId.systemDefault()).toInstant()) : null;
        Date materialExpiry = result.materialValidUntil() == null ? null : Date.from(LocalDateTime.of(
                result.materialValidUntil(), LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant());
        Date expiry = passed && materialExpiry != null && materialExpiry.before(defaultExpiry)
                ? materialExpiry : defaultExpiry;
        certification.setStatus(passed ? ShopProductCertificationService.PASSED
                : ShopProductCertificationService.REJECTED);
        certification.setAiDecision(result.decision().name());
        certification.setConfidence(result.confidence());
        certification.setMatchedFields(objectMapper.writeValueAsString(result.matchedFields()));
        certification.setMissingFields(objectMapper.writeValueAsString(result.missingFields()));
        certification.setRiskFlags(objectMapper.writeValueAsString(result.riskFlags()));
        certification.setMerchantReason(result.merchantReason());
        certification.setPublicSummary(redactPublicSummary(result.publicSummary(), certification.getSupplierName()));
        certification.setMaterialValidUntil(materialExpiry);
        certification.setPassedAt(passedAt);
        certification.setExpiresAt(expiry);
        transactionTemplate.executeWithoutResult(status ->
        {
            if (certificationMapper.completeCertification(certification) == 0) return;
            certificationMapper.insertLog(certification.getCertificationId(), certification.getTenantId(),
                    certification.getMerchantId(), certification.getProductId(),
                    passed ? "AI_PASSED" : "AI_REJECTED", ShopProductCertificationService.PROCESSING,
                    certification.getStatus(), result.merchantReason(), certification.getInputHash(),
                    AiModelMetadata.PROVIDER, properties.getModel(), properties.getPromptVersion(),
                    "AI", "product-certification-ai");
        });
    }

    private void scheduleRetry(ShopProductCertification certification, Exception exception)
    {
        String error = safeError(exception);
        int attempts = Math.max(1, certification.getAttemptCount() == null ? 1 : certification.getAttemptCount());
        long base = Math.max(30, properties.getRetryDelaySeconds());
        long delaySeconds = Math.min(86400L, base * (1L << Math.min(10, attempts - 1)));
        Date retryAt = Date.from(new Date().toInstant().plusSeconds(delaySeconds));
        transactionTemplate.executeWithoutResult(status ->
        {
            certificationMapper.scheduleRetry(certification.getCertificationId(), error, retryAt);
            certificationMapper.insertLog(certification.getCertificationId(), certification.getTenantId(),
                    certification.getMerchantId(), certification.getProductId(), "AI_RETRY",
                    ShopProductCertificationService.PROCESSING, ShopProductCertificationService.PROCESSING,
                    "平台AI处理发生技术异常，任务将自动重试", certification.getInputHash(),
                    AiModelMetadata.PROVIDER, properties.getModel(), properties.getPromptVersion(),
                    "SYSTEM", "product-certification-ai");
        });
        log.error("商品平台AI认证处理失败，certificationId={}，等待重试：{}",
                certification.getCertificationId(), error);
    }

    private void expirePassed()
    {
        for (Long id : certificationMapper.selectExpiredPassedIds(100))
        {
            ShopProductCertification certification = certificationMapper.selectById(id);
            if (certification != null)
            {
                transactionTemplate.executeWithoutResult(status ->
                {
                    if (certificationMapper.expirePassedById(id) == 0) return;
                    certificationMapper.insertLog(id, certification.getTenantId(), certification.getMerchantId(),
                            certification.getProductId(), "EXPIRED", ShopProductCertificationService.PASSED,
                            ShopProductCertificationService.EXPIRED, "平台AI认证已到有效期",
                            certification.getInputHash(), certification.getAiProvider(), certification.getAiModel(),
                            certification.getPromptVersion(), "SYSTEM", "product-certification-expiry");
                });
            }
        }
    }

    private List<String> sanitizeList(List<String> values, String field)
    {
        if (values == null) throw new IllegalArgumentException(field + "必须是数组");
        if (values.size() > 20) throw new IllegalArgumentException(field + "条目过多");
        List<String> result = new ArrayList<>();
        for (String value : values) result.add(sanitizeText(value, field, 120));
        return result;
    }

    private String sanitizeText(String value, String field, int maxLength)
    {
        String text = value == null ? "" : value.replaceAll("[\\p{Cntrl}]", " ")
                .replaceAll("\\s+", " ").trim();
        if (text.isEmpty()) throw new IllegalArgumentException(field + "不能为空");
        if (text.matches("(?is).*(api[ _-]?key|密钥|系统提示词|system prompt|<server_product_snapshot>|<merchant_submission>).*"))
        {
            throw new IllegalArgumentException(field + "包含不允许展示的内部信息");
        }
        if (text.length() > maxLength) throw new IllegalArgumentException(field + "过长");
        return text;
    }

    private LocalDate parseDate(String value)
    {
        if (value == null || value.isBlank()) return null;
        try
        {
            return LocalDate.parse(value.trim());
        }
        catch (DateTimeParseException exception)
        {
            throw new IllegalArgumentException("materialValidUntil必须为YYYY-MM-DD或空字符串", exception);
        }
    }

    private String safeError(Exception exception)
    {
        String message = exception instanceof IllegalArgumentException
                ? exception.getMessage() : exception.getClass().getSimpleName();
        if (message == null || message.isBlank()) message = exception.getClass().getSimpleName();
        message = message.replaceAll("(?i)bearer\\s+[a-z0-9._-]+", "Bearer ***")
                .replaceAll("sk-[a-zA-Z0-9_-]+", "sk-***")
                .replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", " ").trim();
        return message.length() <= 500 ? message : message.substring(0, 500);
    }

    private String redactPublicSummary(String summary, String supplierName)
    {
        String result = summary;
        if (supplierName != null && !supplierName.isBlank())
        {
            result = result.replace(supplierName.trim(), "供货方（已脱敏）");
        }
        return result.replaceAll("(?<!\\d)\\d{6,}(?!\\d)", "******");
    }

    private String json(String value) throws JsonProcessingException
    {
        return objectMapper.writeValueAsString(value == null ? "" : value);
    }

    private record ModelInput(String prompt, List<Media> media) { }
    private record ValidatedResult(ShopProductCertificationAiResult.Decision decision,
            BigDecimal confidence, List<String> matchedFields, List<String> missingFields,
            List<String> riskFlags, String merchantReason, String publicSummary,
            LocalDate materialValidUntil) { }

    private static class NamedByteArrayResource extends ByteArrayResource
    {
        private final String filename;
        NamedByteArrayResource(byte[] bytes, String filename)
        {
            super(bytes);
            this.filename = filename;
        }
        @Override public String getFilename() { return filename; }
    }
}
