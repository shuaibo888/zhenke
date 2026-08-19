package com.ruoyi.shop.domain.vo;

public class ShopPointTransferSource
{
    private String sourceSystem;
    private String sourceName;
    private String sourceUnitName;
    private String coverUrl;

    public ShopPointTransferSource() { }

    public ShopPointTransferSource(String sourceSystem, String sourceName, String sourceUnitName, String coverUrl)
    {
        this.sourceSystem = sourceSystem;
        this.sourceName = sourceName;
        this.sourceUnitName = sourceUnitName;
        this.coverUrl = coverUrl;
    }

    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public String getSourceUnitName() { return sourceUnitName; }
    public void setSourceUnitName(String sourceUnitName) { this.sourceUnitName = sourceUnitName; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
}
