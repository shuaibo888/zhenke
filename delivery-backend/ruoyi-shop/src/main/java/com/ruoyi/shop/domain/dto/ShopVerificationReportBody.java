package com.ruoyi.shop.domain.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ShopVerificationReportBody
{
    @NotNull(message = "请选择当前可发布报告的试用")
    private Long trialApplicationId;
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
    @Valid
    @NotEmpty(message = "请至少上传一张图片")
    @Size(max = 9, message = "报告图片或视频最多9个")
    private List<ShopVerificationResourceBody> resources;

    public Long getTrialApplicationId() { return trialApplicationId; }
    public void setTrialApplicationId(Long trialApplicationId) { this.trialApplicationId = trialApplicationId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getShortcoming() { return shortcoming; }
    public void setShortcoming(String shortcoming) { this.shortcoming = shortcoming; }
    public Boolean getRecommend() { return recommend; }
    public void setRecommend(Boolean recommend) { this.recommend = recommend; }
    public List<ShopVerificationResourceBody> getResources() { return resources; }
    public void setResources(List<ShopVerificationResourceBody> resources) { this.resources = resources; }
}
