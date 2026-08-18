package com.ruoyi.shop.domain.vo;

public class ShopPointTransferResult
{
    private String requestNo;
    private String sourceSystem;
    private String sourceName;
    private Long transferredPoints;
    private Long balance;

    public ShopPointTransferResult() { }

    public ShopPointTransferResult(String requestNo, String sourceSystem, String sourceName,
            Long transferredPoints, Long balance)
    {
        this.requestNo = requestNo;
        this.sourceSystem = sourceSystem;
        this.sourceName = sourceName;
        this.transferredPoints = transferredPoints;
        this.balance = balance;
    }

    public String getRequestNo() { return requestNo; }
    public void setRequestNo(String requestNo) { this.requestNo = requestNo; }
    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public Long getTransferredPoints() { return transferredPoints; }
    public void setTransferredPoints(Long transferredPoints) { this.transferredPoints = transferredPoints; }
    public Long getBalance() { return balance; }
    public void setBalance(Long balance) { this.balance = balance; }
}
