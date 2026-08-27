package com.ruoyi.shop.domain.vo;

/** Public, minimum-data merchant option used by the voluntary post association picker. */
public class ShopMerchantOption {
  private Long merchantId;
  private String shopName;

  public Long getMerchantId() {
    return merchantId;
  }

  public void setMerchantId(Long merchantId) {
    this.merchantId = merchantId;
  }

  public String getShopName() {
    return shopName;
  }

  public void setShopName(String shopName) {
    this.shopName = shopName;
  }
}
