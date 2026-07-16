package com.ruoyi.shop.domain;

import com.ruoyi.common.core.domain.BaseEntity;

public class ShopProductCategory extends BaseEntity
{
    private static final long serialVersionUID = 1L;
    private Long categoryId;
    private String categoryCode;
    private String categoryName;
    private Integer categorySort;
    private String status;

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public Integer getCategorySort() { return categorySort; }
    public void setCategorySort(Integer categorySort) { this.categorySort = categorySort; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
