package com.ruoyi.shop.ai;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.shop.domain.ShopVerificationReport;
import com.ruoyi.shop.domain.ShopVerificationReportAiScore;
import com.ruoyi.shop.domain.dto.ShopVerificationReportAiResult;
import com.ruoyi.shop.mapper.ShopTrialMapper;
import com.ruoyi.shop.mapper.ShopVerificationReportAiScoreMapper;

@Service
public class ShopVerificationReportAiScoreService
{
    private static final Logger log = LoggerFactory.getLogger(ShopVerificationReportAiScoreService.class);
    private static final BigDecimal MIN_SCORE = new BigDecimal("0.0");
    private static final BigDecimal MAX_SCORE = new BigDecimal("5.0");
    private static final BigDecimal MISMATCH_SCORE_CAP = new BigDecimal("1.0");
    private static final BigDecimal UNCERTAIN_SCORE_CAP = new BigDecimal("2.0");
    private static final int MAX_INPUT_FIELD_LENGTH = 4000;
    private static final Set<String> RESULT_FIELDS = Set.of(
            "productMatch", "productMatchReason", "reason", "dimensions");
    private static final Set<String> DIMENSION_FIELDS = Set.of(
            "authenticity", "completeness", "balance", "decisionValue");
    private final ShopAiScoreProperties properties;
    private final ShopTrialMapper trialMapper;
    private final ShopVerificationReportAiScoreMapper scoreMapper;
    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final String apiKey;
    private final AtomicBoolean missingKeyLogged = new AtomicBoolean();

    public ShopVerificationReportAiScoreService(ShopAiScoreProperties properties,
            ShopTrialMapper trialMapper,
            ShopVerificationReportAiScoreMapper scoreMapper,
            ChatClient.Builder chatClientBuilder,
            ObjectMapper objectMapper,
            TransactionTemplate transactionTemplate,
            @Value("${spring.ai.dashscope.api-key:}") String apiKey)
    {
        this.properties = properties;
        this.trialMapper = trialMapper;
        this.scoreMapper = scoreMapper;
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = objectMapper;
        this.transactionTemplate = transactionTemplate;
        this.apiKey = apiKey;
    }

    public int processPendingBatch()
    {
        if (!isReady())
        {
            return 0;
        }
        recoverStaleTasks();
        List<Long> reportIds = scoreMapper.selectPendingReportIds(
                properties.getMaxAttempts(), properties.getBatchSize());
        int processed = 0;
        for (Long reportId : reportIds)
        {
            if (processReport(reportId))
            {
                processed++;
            }
        }
        return processed;
    }

    boolean processReport(long reportId)
    {
        ShopVerificationReport report = trialMapper.selectReportById(reportId);
        if (report == null || !"PUBLISHED".equals(report.getStatus()))
        {
            return false;
        }

        String inputJson = buildInputJson(report);
        String inputHash = sha256(properties.getPromptVersion() + "\n" + properties.getModel() + "\n" + inputJson);
        Long scoreId = transactionTemplate.execute(status -> claim(reportId, inputHash));
        if (scoreId == null)
        {
            return false;
        }

        try
        {
            String rawContent = chatClient.prompt()
                    .system(AiPrompts.VERIFICATION_REPORT_SYSTEM)
                    .user(AiPrompts.verificationReportUser(inputJson))
                    .options(DashScopeChatOptions.builder().model(properties.getModel()).build())
                    .call()
                    .content();
            ShopVerificationReportAiResult rawResult = parseStrictResult(rawContent);
            ValidatedResult result = validate(rawResult);
            Map<String, Object> auditDetails = new LinkedHashMap<>();
            auditDetails.put("productMatch", result.productMatch().name());
            auditDetails.put("productMatchReason", result.productMatchReason());
            auditDetails.put("dimensions", result.dimensions());
            String dimensionsJson = objectMapper.writeValueAsString(auditDetails);
            transactionTemplate.executeWithoutResult(status -> complete(
                    reportId, scoreId, inputHash, result, dimensionsJson));
            return true;
        }
        catch (Exception exception)
        {
            String errorMessage = safeError(exception);
            try
            {
                transactionTemplate.executeWithoutResult(status -> fail(
                        reportId, scoreId, inputHash, errorMessage));
            }
            catch (Exception persistenceException)
            {
                log.error("甄客验智能评分失败状态持久化异常，reportId={}, scoreId={}", reportId, scoreId,
                        persistenceException);
            }
            log.warn("甄客验智能评分调用失败，reportId={}, scoreId={}, errorType={}",
                    reportId, scoreId, exception.getClass().getSimpleName());
            return false;
        }
    }

    static BigDecimal normalizeScore(BigDecimal value, String field)
    {
        if (value == null)
        {
            throw new IllegalArgumentException(field + "不能为空");
        }
        if (value.compareTo(MIN_SCORE) < 0 || value.compareTo(MAX_SCORE) > 0)
        {
            throw new IllegalArgumentException(field + "超出0.0至5.0范围");
        }
        return value.setScale(1, RoundingMode.HALF_UP);
    }

    private Long claim(long reportId, String inputHash)
    {
        if (scoreMapper.claimReport(reportId, properties.getPromptVersion(), inputHash,
                properties.getMaxAttempts()) == 0)
        {
            return null;
        }
        ShopVerificationReportAiScore attempt = new ShopVerificationReportAiScore();
        attempt.setReportId(reportId);
        attempt.setModelProvider(AiModelMetadata.PROVIDER);
        attempt.setModelName(properties.getModel());
        attempt.setPromptVersion(properties.getPromptVersion());
        attempt.setInputHash(inputHash);
        if (scoreMapper.insertAttempt(attempt) == 0 || attempt.getScoreId() == null)
        {
            throw new IllegalStateException("创建智能评分审计记录失败");
        }
        if (scoreMapper.bindRunningAttempt(reportId, attempt.getScoreId(),
                properties.getPromptVersion(), inputHash) == 0)
        {
            throw new IllegalStateException("绑定智能评分审计记录失败");
        }
        return attempt.getScoreId();
    }

    private void complete(long reportId, long scoreId, String inputHash,
            ValidatedResult result, String dimensionsJson)
    {
        if (scoreMapper.completeAttempt(scoreId, result.score(), result.reason(), dimensionsJson) == 0
                || scoreMapper.completeReport(reportId, scoreId, properties.getPromptVersion(),
                        inputHash, result.score()) == 0)
        {
            throw new IllegalStateException("智能评分任务状态已变化");
        }
    }

    private void fail(long reportId, long scoreId, String inputHash, String errorMessage)
    {
        scoreMapper.failAttempt(scoreId, errorMessage);
        scoreMapper.failReport(reportId, scoreId, properties.getPromptVersion(), inputHash,
                properties.getMaxAttempts(), properties.getRetryDelaySeconds());
    }

    private void recoverStaleTasks()
    {
        transactionTemplate.executeWithoutResult(status -> {
            scoreMapper.failStaleAttempts(properties.getRunningTimeoutMinutes());
            scoreMapper.recoverStaleReports(properties.getRunningTimeoutMinutes(),
                    properties.getMaxAttempts(), properties.getRetryDelaySeconds());
        });
    }

    private boolean isReady()
    {
        if (!properties.isEnabled())
        {
            return false;
        }
        if (StringUtils.isEmpty(apiKey) || "not-configured".equals(apiKey))
        {
            if (missingKeyLogged.compareAndSet(false, true))
            {
                log.error("甄客验智能评分已启用，但未在application.yml的spring.ai.dashscope.api-key中配置百炼API Key，任务将保持待处理");
            }
            return false;
        }
        return true;
    }

    private String buildInputJson(ShopVerificationReport report)
    {
        Map<String, Object> input = new LinkedHashMap<>();
        Map<String, Object> targetProduct = new LinkedHashMap<>();
        targetProduct.put("productId", report.getProductId());
        targetProduct.put("productName", clip(report.getProductName()));
        targetProduct.put("subtitle", clip(report.getProductSubtitle()));
        targetProduct.put("detail", clip(report.getProductDetail()));
        targetProduct.put("categoryName", clip(report.getCategoryName()));
        targetProduct.put("merchantName", clip(report.getMerchantName()));
        input.put("targetProduct", targetProduct);

        Map<String, Object> reportData = new LinkedHashMap<>();
        reportData.put("reportSource", report.getReportSource());
        reportData.put("trialType", report.getTrialType());
        reportData.put("title", clip(report.getTitle()));
        reportData.put("experience", clip(report.getExperience()));
        reportData.put("shortcoming", clip(report.getShortcoming()));
        reportData.put("recommend", "0".equals(report.getRecommend()));
        if ("PURCHASE".equals(report.getReportSource()))
        {
            Map<String, Integer> userRatings = new LinkedHashMap<>();
            userRatings.put("productQuality", report.getProductQuality());
            userRatings.put("logisticsService", report.getLogisticsService());
            userRatings.put("serviceAttitude", report.getServiceAttitude());
            reportData.put("userRatingsContextOnly", userRatings);
        }
        input.put("reportData", reportData);
        try
        {
            return objectMapper.writeValueAsString(input);
        }
        catch (JsonProcessingException exception)
        {
            throw new IllegalStateException("构建智能评分输入失败", exception);
        }
    }

    private ValidatedResult validate(ShopVerificationReportAiResult result)
    {
        if (result == null || result.productMatch() == null || result.dimensions() == null)
        {
            throw new IllegalArgumentException("智能评分结果缺少必填字段");
        }
        String productMatchReason = sanitizeText(result.productMatchReason(), "商品一致性依据", 120);
        String reason = sanitizeText(result.reason(), "智能点评", 220);
        Map<String, BigDecimal> dimensions = new LinkedHashMap<>();
        dimensions.put("authenticity", normalizeScore(result.dimensions().authenticity(), "authenticity"));
        dimensions.put("completeness", normalizeScore(result.dimensions().completeness(), "completeness"));
        dimensions.put("balance", normalizeScore(result.dimensions().balance(), "balance"));
        dimensions.put("decisionValue", normalizeScore(result.dimensions().decisionValue(), "decisionValue"));
        BigDecimal score = calculateWeightedScore(dimensions);
        score = applyProductMatchCap(score, result.productMatch());
        String displayReason = buildDisplayReason(result.productMatch(), productMatchReason, reason);
        return new ValidatedResult(score, displayReason, result.productMatch(), productMatchReason, dimensions);
    }

    private ShopVerificationReportAiResult parseStrictResult(String rawContent)
    {
        if (rawContent == null || rawContent.isBlank())
        {
            throw new IllegalArgumentException("智能评分结果为空");
        }
        try
        {
            JsonNode root = objectMapper.readTree(rawContent);
            requireExactObjectFields(root, RESULT_FIELDS, "智能评分结果");
            requireText(root, "productMatch");
            requireText(root, "productMatchReason");
            requireText(root, "reason");
            JsonNode dimensions = root.get("dimensions");
            requireExactObjectFields(dimensions, DIMENSION_FIELDS, "评分维度");
            for (String field : DIMENSION_FIELDS)
            {
                if (!dimensions.get(field).isNumber())
                {
                    throw new IllegalArgumentException("评分维度" + field + "必须是数字");
                }
            }
            return objectMapper.treeToValue(root, ShopVerificationReportAiResult.class);
        }
        catch (JsonProcessingException exception)
        {
            throw new IllegalArgumentException("智能评分结果不是符合约定的JSON对象", exception);
        }
    }

    private void requireExactObjectFields(JsonNode node, Set<String> expectedFields, String field)
    {
        if (node == null || !node.isObject())
        {
            throw new IllegalArgumentException(field + "必须是JSON对象");
        }
        Set<String> actualFields = new LinkedHashSet<>();
        node.fieldNames().forEachRemaining(actualFields::add);
        if (!actualFields.equals(expectedFields))
        {
            throw new IllegalArgumentException(field + "字段必须严格为" + expectedFields);
        }
    }

    private void requireText(JsonNode node, String field)
    {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual() || value.textValue().isBlank())
        {
            throw new IllegalArgumentException(field + "必须是非空字符串");
        }
    }

    static BigDecimal calculateWeightedScore(Map<String, BigDecimal> dimensions)
    {
        BigDecimal weighted = dimensions.get("authenticity").multiply(new BigDecimal("0.35"))
                .add(dimensions.get("completeness").multiply(new BigDecimal("0.25")))
                .add(dimensions.get("balance").multiply(new BigDecimal("0.20")))
                .add(dimensions.get("decisionValue").multiply(new BigDecimal("0.20")));
        return normalizeScore(weighted, "score");
    }

    static BigDecimal applyProductMatchCap(BigDecimal score,
            ShopVerificationReportAiResult.ProductMatch productMatch)
    {
        return switch (productMatch)
        {
            case MISMATCH -> score.min(MISMATCH_SCORE_CAP);
            case UNCERTAIN -> score.min(UNCERTAIN_SCORE_CAP);
            case MATCH -> score;
        };
    }

    private String buildDisplayReason(ShopVerificationReportAiResult.ProductMatch productMatch,
            String productMatchReason, String reason)
    {
        String combined = switch (productMatch)
        {
            case MISMATCH -> "内容与目标商品不一致：" + productMatchReason + "；" + reason;
            case UNCERTAIN -> "内容与目标商品关联不足：" + productMatchReason + "；" + reason;
            case MATCH -> reason;
        };
        int limit = Math.max(1, properties.getReasonMaxLength());
        return combined.length() <= limit ? combined : combined.substring(0, limit);
    }

    private String sanitizeText(String value, String field, int maxLength)
    {
        String reason = value == null ? "" : value.replaceAll("[\\p{Cntrl}]", " ")
                .replaceAll("\\s+", " ").trim();
        if (reason.isEmpty())
        {
            throw new IllegalArgumentException(field + "不能为空");
        }
        if (reason.matches("(?is).*(api[ _-]?key|密钥|系统提示词|system prompt|<report_data>|<input_json>).*"))
        {
            throw new IllegalArgumentException(field + "包含不允许展示的内部信息");
        }
        int limit = Math.max(1, maxLength);
        if (reason.length() > limit)
        {
            throw new IllegalArgumentException(field + "不能超过" + limit + "个字符");
        }
        return reason;
    }

    private String safeError(Exception exception)
    {
        String message;
        if (exception instanceof IllegalArgumentException)
        {
            message = exception.getMessage();
        }
        else
        {
            message = exception.getClass().getSimpleName();
        }
        if (message == null || message.isBlank()) message = exception.getClass().getSimpleName();
        message = message.replaceAll("(?i)bearer\\s+[a-z0-9._-]+", "Bearer ***")
                .replaceAll("sk-[a-zA-Z0-9_-]+", "sk-***")
                .replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", " ")
                .trim();
        return message.length() <= 500 ? message : message.substring(0, 500);
    }

    private static String clip(String value)
    {
        String text = value == null ? "" : value.trim();
        return text.length() <= MAX_INPUT_FIELD_LENGTH ? text : text.substring(0, MAX_INPUT_FIELD_LENGTH);
    }

    private static String sha256(String value)
    {
        try
        {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        }
        catch (NoSuchAlgorithmException exception)
        {
            throw new IllegalStateException("当前JVM不支持SHA-256", exception);
        }
    }

    private record ValidatedResult(BigDecimal score, String reason,
                                   ShopVerificationReportAiResult.ProductMatch productMatch,
                                   String productMatchReason,
                                   Map<String, BigDecimal> dimensions)
    {
    }
}
