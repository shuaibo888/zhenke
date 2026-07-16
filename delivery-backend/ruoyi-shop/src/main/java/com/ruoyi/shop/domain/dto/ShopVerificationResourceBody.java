package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopVerificationResourceBody
{
    @NotBlank(message = "请选择资源类型")
    @Pattern(regexp = "IMAGE|VIDEO", message = "资源类型无效")
    private String resourceType;
    @NotBlank(message = "资源地址不能为空")
    @Size(max = 500, message = "资源地址不能超过500个字符")
    private String resourceUrl;
    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public String getResourceUrl() { return resourceUrl; }
    public void setResourceUrl(String resourceUrl) { this.resourceUrl = resourceUrl; }
}
