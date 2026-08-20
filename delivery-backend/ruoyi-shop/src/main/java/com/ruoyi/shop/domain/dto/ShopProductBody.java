package com.ruoyi.shop.domain.dto;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopProductBody
{
    @NotNull(message = "请选择商品分类")
    private Long categoryId;

    @NotBlank(message = "请输入商品品牌")
    @Size(max = 100, message = "商品品牌不能超过100个字符")
    private String brandName;

    @NotBlank(message = "请输入商品名称")
    @Size(max = 120, message = "商品名称不能超过120个字符")
    private String productName;

    @Size(max = 200, message = "商品副标题不能超过200个字符")
    private String subtitle;

    @NotBlank(message = "请设置商品封面")
    @Size(max = 500, message = "商品封面地址不能超过500个字符")
    private String coverUrl;

    @NotNull(message = "请输入商品价格")
    @DecimalMin(value = "0.01", message = "商品价格必须大于0")
    @Digits(integer = 8, fraction = 2, message = "商品价格最多8位整数和2位小数")
    private BigDecimal price;

    @NotNull(message = "请输入商品库存")
    @Min(value = 0, message = "商品库存不能小于0")
    @Max(value = 999999999, message = "商品库存过大")
    private Integer stock;

    private Boolean supportsOnline;
    private Boolean supportsOffline;

    @Size(max = 6, message = "商品主图最多6张")
    private List<@NotBlank(message = "商品主图地址不能为空") @Size(max = 500, message = "商品主图地址不能超过500个字符") String> mainImageUrls;

    @Size(max = 6, message = "商品详情图最多6张")
    private List<@NotBlank(message = "商品详情图地址不能为空") @Size(max = 500, message = "商品详情图地址不能超过500个字符") String> detailImageUrls;

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public Boolean getSupportsOnline() { return supportsOnline; }
    public void setSupportsOnline(Boolean supportsOnline) { this.supportsOnline = supportsOnline; }
    public Boolean getSupportsOffline() { return supportsOffline; }
    public void setSupportsOffline(Boolean supportsOffline) { this.supportsOffline = supportsOffline; }
    public List<String> getMainImageUrls() { return mainImageUrls; }
    public void setMainImageUrls(List<String> mainImageUrls) { this.mainImageUrls = mainImageUrls; }
    public List<String> getDetailImageUrls() { return detailImageUrls; }
    public void setDetailImageUrls(List<String> detailImageUrls) { this.detailImageUrls = detailImageUrls; }
}
