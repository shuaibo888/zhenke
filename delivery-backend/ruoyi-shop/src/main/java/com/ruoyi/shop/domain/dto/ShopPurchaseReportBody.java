package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopPurchaseReportBody
{
    @NotNull(message = "请选择要评价的订单商品")
    private Long orderItemId;
    @NotBlank(message = "请输入真实体验")
    @Size(min = 20, max = 10000, message = "真实体验长度必须在20到10000个字符之间")
    private String experience;
    @NotBlank(message = "请如实填写产品不足")
    @Size(max = 2000, message = "产品不足不能超过2000个字符")
    private String shortcoming;
    @NotBlank(message = "请输入适合人群")
    @Size(max = 1000, message = "适合人群不能超过1000个字符")
    private String fitCrowd;
    @NotNull(message = "请选择是否推荐")
    private Boolean recommend;
    @NotNull @Min(1) @Max(5)
    private Integer productQuality;
    @NotNull @Min(1) @Max(5)
    private Integer logisticsService;
    @NotNull @Min(1) @Max(5)
    private Integer serviceAttitude;
    @Valid
    @Size(max = 9, message = "评价图片最多9张")
    private List<ShopVerificationResourceBody> resources;

    public Long getOrderItemId() { return orderItemId; }
    public void setOrderItemId(Long orderItemId) { this.orderItemId = orderItemId; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getShortcoming() { return shortcoming; }
    public void setShortcoming(String shortcoming) { this.shortcoming = shortcoming; }
    public String getFitCrowd() { return fitCrowd; }
    public void setFitCrowd(String fitCrowd) { this.fitCrowd = fitCrowd; }
    public Boolean getRecommend() { return recommend; }
    public void setRecommend(Boolean recommend) { this.recommend = recommend; }
    public Integer getProductQuality() { return productQuality; }
    public void setProductQuality(Integer productQuality) { this.productQuality = productQuality; }
    public Integer getLogisticsService() { return logisticsService; }
    public void setLogisticsService(Integer logisticsService) { this.logisticsService = logisticsService; }
    public Integer getServiceAttitude() { return serviceAttitude; }
    public void setServiceAttitude(Integer serviceAttitude) { this.serviceAttitude = serviceAttitude; }
    public List<ShopVerificationResourceBody> getResources() { return resources; }
    public void setResources(List<ShopVerificationResourceBody> resources) { this.resources = resources; }
}
