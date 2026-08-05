package com.ruoyi.shop.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "shop.product-certification")
public class ShopProductCertificationProperties
{
    private boolean enabled;
    private String model = "qwen3.7-plus";
    private String promptVersion = "product-supply-certification-v1";
    private String storagePath;
    private int batchSize = 5;
    private int retryDelaySeconds = 300;
    private int runningTimeoutMinutes = 15;
    private int validityDays = 365;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getPromptVersion() { return promptVersion; }
    public void setPromptVersion(String promptVersion) { this.promptVersion = promptVersion; }
    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
    public int getBatchSize() { return batchSize; }
    public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
    public int getRetryDelaySeconds() { return retryDelaySeconds; }
    public void setRetryDelaySeconds(int retryDelaySeconds) { this.retryDelaySeconds = retryDelaySeconds; }
    public int getRunningTimeoutMinutes() { return runningTimeoutMinutes; }
    public void setRunningTimeoutMinutes(int runningTimeoutMinutes) { this.runningTimeoutMinutes = runningTimeoutMinutes; }
    public int getValidityDays() { return validityDays; }
    public void setValidityDays(int validityDays) { this.validityDays = validityDays; }
}
