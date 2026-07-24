package com.ruoyi.shop.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "shop.ai-score")
public class ShopAiScoreProperties
{
    private boolean enabled;
    private String provider = "DASHSCOPE";
    private String promptVersion = "qwen-report-quality-v2-product-match";
    private int batchSize = 10;
    private int maxAttempts = 3;
    private int retryDelaySeconds = 300;
    private int runningTimeoutMinutes = 10;
    private int reasonMaxLength = 300;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getPromptVersion() { return promptVersion; }
    public void setPromptVersion(String promptVersion) { this.promptVersion = promptVersion; }
    public int getBatchSize() { return batchSize; }
    public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public int getRetryDelaySeconds() { return retryDelaySeconds; }
    public void setRetryDelaySeconds(int retryDelaySeconds) { this.retryDelaySeconds = retryDelaySeconds; }
    public int getRunningTimeoutMinutes() { return runningTimeoutMinutes; }
    public void setRunningTimeoutMinutes(int runningTimeoutMinutes) { this.runningTimeoutMinutes = runningTimeoutMinutes; }
    public int getReasonMaxLength() { return reasonMaxLength; }
    public void setReasonMaxLength(int reasonMaxLength) { this.reasonMaxLength = reasonMaxLength; }
}
