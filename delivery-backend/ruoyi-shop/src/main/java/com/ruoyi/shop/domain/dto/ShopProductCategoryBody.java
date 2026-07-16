package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopProductCategoryBody
{
    @NotBlank(message = "请输入分类名称")
    @Size(max = 50, message = "分类名称不能超过50个字符")
    private String categoryName;

    @NotNull(message = "请输入分类排序")
    @Min(value = 1, message = "分类排序不能小于1")
    @Max(value = 9999, message = "分类排序不能大于9999")
    private Integer categorySort;

    @NotBlank(message = "请选择分类状态")
    @Pattern(regexp = "0|1", message = "分类状态无效")
    private String status;

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public Integer getCategorySort() { return categorySort; }
    public void setCategorySort(Integer categorySort) { this.categorySort = categorySort; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
