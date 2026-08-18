package com.ruoyi.shop.domain.vo;

public class ShopPointTransferSource
{
    private String sourceSystem;
    private String sourceName;

    public ShopPointTransferSource() { }

    public ShopPointTransferSource(String sourceSystem, String sourceName)
    {
        this.sourceSystem = sourceSystem;
        this.sourceName = sourceName;
    }

    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
}
