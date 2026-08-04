package com.ruoyi.shop.domain;

import java.io.Serializable;

public class ShopProductImage implements Serializable
{
    private static final long serialVersionUID = 1L;
    private Long imageId;
    private Long productId;
    private String imageType;
    private String imageUrl;
    private Integer imageSort;

    public Long getImageId() { return imageId; }
    public void setImageId(Long imageId) { this.imageId = imageId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getImageType() { return imageType; }
    public void setImageType(String imageType) { this.imageType = imageType; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public Integer getImageSort() { return imageSort; }
    public void setImageSort(Integer imageSort) { this.imageSort = imageSort; }
}
