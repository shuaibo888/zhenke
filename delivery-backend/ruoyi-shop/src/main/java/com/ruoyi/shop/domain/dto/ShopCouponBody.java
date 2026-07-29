package com.ruoyi.shop.domain.dto;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopCouponBody
{
    @NotBlank(message = "请输入优惠券名称")
    @Size(max = 100, message = "优惠券名称不能超过100个字符")
    private String couponName;

    @Size(max = 500, message = "优惠券说明不能超过500个字符")
    private String description;

    @NotNull(message = "请输入优惠金额")
    @DecimalMin(value = "0.01", message = "优惠金额必须大于0")
    @Digits(integer = 8, fraction = 2, message = "优惠金额最多8位整数和2位小数")
    private BigDecimal discountAmount;

    @NotNull(message = "请输入最低消费金额")
    @DecimalMin(value = "0.00", message = "最低消费金额不能小于0")
    @Digits(integer = 8, fraction = 2, message = "最低消费金额最多8位整数和2位小数")
    private BigDecimal minimumSpend;

    @NotNull(message = "请选择开始时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date startTime;

    @NotNull(message = "请选择结束时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date endTime;

    @NotBlank(message = "请选择优惠券状态")
    @Pattern(regexp = "ENABLED|DISABLED", message = "优惠券状态无效")
    private String status;

    @NotNull(message = "请输入优惠券库存")
    @Min(value = 1, message = "优惠券库存至少为1张")
    @Max(value = 100000000, message = "优惠券库存过大")
    private Integer totalStock;

    @NotEmpty(message = "请至少选择一个适用商家")
    @Size(max = 200, message = "单张优惠券最多指定200个商家")
    private List<@NotNull(message = "适用商家不能为空") Long> merchantIds;

    public String getCouponName() { return couponName; }
    public void setCouponName(String couponName) { this.couponName = couponName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getMinimumSpend() { return minimumSpend; }
    public void setMinimumSpend(BigDecimal minimumSpend) { this.minimumSpend = minimumSpend; }
    public Date getStartTime() { return startTime; }
    public void setStartTime(Date startTime) { this.startTime = startTime; }
    public Date getEndTime() { return endTime; }
    public void setEndTime(Date endTime) { this.endTime = endTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getTotalStock() { return totalStock; }
    public void setTotalStock(Integer totalStock) { this.totalStock = totalStock; }
    public List<Long> getMerchantIds() { return merchantIds; }
    public void setMerchantIds(List<Long> merchantIds) { this.merchantIds = merchantIds; }
}
