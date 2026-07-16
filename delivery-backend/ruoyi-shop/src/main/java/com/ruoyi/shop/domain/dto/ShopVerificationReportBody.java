package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopVerificationReportBody
{
    @NotNull(message = "请选择已确认收货的试用")
    private Long trialApplicationId;
    @NotBlank(message = "请输入真实体验")
    @Size(max = 10000, message = "真实体验不能超过10000个字符")
    private String experience;
    @NotBlank(message = "请如实填写产品不足")
    @Size(max = 2000, message = "产品不足不能超过2000个字符")
    private String shortcoming;
    @NotBlank(message = "请输入适合人群")
    @Size(max = 1000, message = "适合人群不能超过1000个字符")
    private String fitCrowd;
    @NotNull(message = "请选择是否推荐")
    private Boolean recommend;
    @Valid
    @Size(max = 10, message = "报告资源最多10个")
    private List<ShopVerificationResourceBody> resources;

    public Long getTrialApplicationId() { return trialApplicationId; }
    public void setTrialApplicationId(Long trialApplicationId) { this.trialApplicationId = trialApplicationId; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getShortcoming() { return shortcoming; }
    public void setShortcoming(String shortcoming) { this.shortcoming = shortcoming; }
    public String getFitCrowd() { return fitCrowd; }
    public void setFitCrowd(String fitCrowd) { this.fitCrowd = fitCrowd; }
    public Boolean getRecommend() { return recommend; }
    public void setRecommend(Boolean recommend) { this.recommend = recommend; }
    public List<ShopVerificationResourceBody> getResources() { return resources; }
    public void setResources(List<ShopVerificationResourceBody> resources) { this.resources = resources; }
}
