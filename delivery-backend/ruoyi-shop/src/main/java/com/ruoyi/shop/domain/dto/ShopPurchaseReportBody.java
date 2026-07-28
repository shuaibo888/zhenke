package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopPurchaseReportBody
{
    @NotNull(message = "请选择要评价的订单商品")
    private Long orderItemId;
    @NotBlank(message = "请输入甄客验标题")
    @Size(max = 20, message = "甄客验标题不能超过20个字符")
    private String title;
    @NotBlank(message = "请输入真实体验")
    @Size(min = 20, max = 500, message = "真实体验长度必须在20到500个字符之间")
    private String experience;
    @NotBlank(message = "请填写优化建议")
    @Size(max = 500, message = "优化建议不能超过500个字符")
    private String shortcoming;
    @NotNull(message = "请选择是否在首页推荐")
    private Boolean recommend;
    @NotNull @Min(1) @Max(5)
    private Integer productQuality;
    @NotNull @Min(1) @Max(5)
    private Integer logisticsService;
    @NotNull @Min(1) @Max(5)
    private Integer serviceAttitude;
    @Valid
    @NotEmpty(message = "请至少上传一张图片")
    @Size(max = 9, message = "报告图片或视频最多9个")
    private List<ShopVerificationResourceBody> resources;

    public Long getOrderItemId() { return orderItemId; }
    public void setOrderItemId(Long orderItemId) { this.orderItemId = orderItemId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getShortcoming() { return shortcoming; }
    public void setShortcoming(String shortcoming) { this.shortcoming = shortcoming; }
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
