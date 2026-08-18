package com.ruoyi.shop.domain.vo;

public class ShopPointTransferBalance
{
    private String sourceSystem;
    private String sourceName;
    private Long availablePoints;

    public ShopPointTransferBalance() { }

    public ShopPointTransferBalance(String sourceSystem, String sourceName, Long availablePoints)
    {
        this.sourceSystem = sourceSystem;
        this.sourceName = sourceName;
        this.availablePoints = availablePoints;
    }

    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public Long getAvailablePoints() { return availablePoints; }
    public void setAvailablePoints(Long availablePoints) { this.availablePoints = availablePoints; }
}
