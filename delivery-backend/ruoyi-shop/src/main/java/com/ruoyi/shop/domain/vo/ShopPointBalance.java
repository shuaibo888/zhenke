package com.ruoyi.shop.domain.vo;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

public class ShopPointBalance
{
    private Long balance;
    private Long totalTransferredIn;
    private Long totalConsumed;
    private Date lastTransferTime;

    public Long getBalance() { return balance; }
    public void setBalance(Long balance) { this.balance = balance; }
    public Long getTotalTransferredIn() { return totalTransferredIn; }
    public void setTotalTransferredIn(Long totalTransferredIn) { this.totalTransferredIn = totalTransferredIn; }
    public Long getTotalConsumed() { return totalConsumed; }
    public void setTotalConsumed(Long totalConsumed) { this.totalConsumed = totalConsumed; }
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss") public Date getLastTransferTime() { return lastTransferTime; }
    public void setLastTransferTime(Date lastTransferTime) { this.lastTransferTime = lastTransferTime; }
}
