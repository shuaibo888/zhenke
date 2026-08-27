import {
  CompassOutlined,
  EnvironmentOutlined,
  RightOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "umi";
import {
  fetchPublicMerchant,
  type PublicMerchantDto,
} from "@/services/shopContent";
import { openMerchantNavigation } from "@/utils/merchantNavigation";
import styles from "@/styles/commerce.less";

export function MerchantInfoBar({
  merchantId,
  merchantName,
}: {
  merchantId: number;
  merchantName: string;
}) {
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<PublicMerchantDto>();

  useEffect(() => {
    let active = true;
    fetchPublicMerchant(merchantId)
      .then((value) => {
        if (active) setMerchant(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [merchantId]);

  return (
    <section className={styles.merchantInfoBar} aria-label="商品所属商家">
      <button
        type="button"
        className={styles.merchantInfoMain}
        onClick={() => navigate(`/merchants/${merchantId}`)}
      >
        <span className={styles.merchantInfoIcon}>
          <ShopOutlined />
        </span>
        <span className={styles.merchantInfoCopy}>
          <small>甄客行入驻商家</small>
          <strong>{merchant?.shopName || merchantName}</strong>
          {merchant?.storeAddress && (
            <em>
              <EnvironmentOutlined /> {merchant.storeAddress}
            </em>
          )}
        </span>
        <RightOutlined className={styles.merchantInfoArrow} />
      </button>
      {merchant &&
        Number.isFinite(merchant.latitude) &&
        Number.isFinite(merchant.longitude) && (
          <button
            type="button"
            className={styles.merchantNavigation}
            onClick={() => void openMerchantNavigation(merchant)}
            aria-label={`导航前往${merchant.shopName}`}
          >
            <CompassOutlined /> 导航
          </button>
        )}
    </section>
  );
}
