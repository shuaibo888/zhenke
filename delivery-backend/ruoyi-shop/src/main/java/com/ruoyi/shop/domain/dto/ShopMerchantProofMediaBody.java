package com.ruoyi.shop.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ShopMerchantProofMediaBody
{
    @NotBlank(message = "门店证明材料类型不能为空")
    @Pattern(regexp = "IMAGE|VIDEO", message = "门店证明材料类型无效")
    private String mediaType;

    @NotBlank(message = "门店证明材料地址不能为空")
    @Size(max = 500, message = "门店证明材料地址不能超过500个字符")
    private String mediaUrl;

    public String getMediaType() { return mediaType; }
    public void setMediaType(String mediaType) { this.mediaType = mediaType; }
    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }
}
