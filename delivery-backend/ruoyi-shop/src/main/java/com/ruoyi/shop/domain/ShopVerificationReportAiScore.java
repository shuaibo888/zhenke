package com.ruoyi.shop.domain;

import java.math.BigDecimal;
import java.util.Date;

public class ShopVerificationReportAiScore
{
    private Long scoreId;
    private Long reportId;
    private String status;
    private BigDecimal score;
    private String reason;
    private String dimensionsJson;
    private String modelProvider;
    private String modelName;
    private String promptVersion;
    private String inputHash;
    private String errorMessage;
    private Date startedAt;
    private Date completedAt;
    private Date createTime;

    public Long getScoreId() { return scoreId; }
    public void setScoreId(Long scoreId) { this.scoreId = scoreId; }
    public Long getReportId() { return reportId; }
    public void setReportId(Long reportId) { this.reportId = reportId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getDimensionsJson() { return dimensionsJson; }
    public void setDimensionsJson(String dimensionsJson) { this.dimensionsJson = dimensionsJson; }
    public String getModelProvider() { return modelProvider; }
    public void setModelProvider(String modelProvider) { this.modelProvider = modelProvider; }
    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getPromptVersion() { return promptVersion; }
    public void setPromptVersion(String promptVersion) { this.promptVersion = promptVersion; }
    public String getInputHash() { return inputHash; }
    public void setInputHash(String inputHash) { this.inputHash = inputHash; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Date getStartedAt() { return startedAt; }
    public void setStartedAt(Date startedAt) { this.startedAt = startedAt; }
    public Date getCompletedAt() { return completedAt; }
    public void setCompletedAt(Date completedAt) { this.completedAt = completedAt; }
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
}
