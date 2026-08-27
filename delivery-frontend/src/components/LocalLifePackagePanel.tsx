import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { PublicProductDto } from "@/services/shopContent";
import styles from "@/styles/zhenke.less";

const localLifeScenes: Record<string, { label: string; short: string }> = {
  ZHENKE_HOTEL: { label: "甄客酒店", short: "住" },
  ZHENKE_RESTAURANT: { label: "甄客饭店", short: "食" },
  ZHENKE_SCENIC: { label: "甄客景区", short: "游" },
};

export function LocalLifePackagePanel({
  product,
}: {
  product: PublicProductDto;
}) {
  const scene = localLifeScenes[product.categoryCode];
  const hasRules = Boolean(
    product.packageContent ||
      product.usageNotice ||
      product.validityDescription ||
      product.reservationNotice ||
      product.refundExpiryRule,
  );
  if (!scene && !hasRules) return null;

  return (
    <section
      className={styles.packagePanel}
      aria-labelledby="package-panel-title"
    >
      <header className={styles.packagePanelHeader}>
        <span className={styles.packageSceneMark}>{scene?.short || "享"}</span>
        <div>
          <small>{scene?.label || product.categoryName} · 购买前必读</small>
          <h2 id="package-panel-title">套餐与到店使用</h2>
          <p>规则由商家上架并由服务端保存；支付后仍以订单中的规则快照为准。</p>
        </div>
      </header>
      <div className={styles.packageRuleGrid}>
        <article>
          <CheckCircleOutlined />
          <div>
            <strong>套餐包含</strong>
            <p>{product.packageContent || "请查看商品详情或联系商家确认。"}</p>
          </div>
        </article>
        <article>
          <SafetyCertificateOutlined />
          <div>
            <strong>使用须知</strong>
            <p>{product.usageNotice || "到店前请出示订单核销码。"}</p>
          </div>
        </article>
        <article>
          <ClockCircleOutlined />
          <div>
            <strong>有效期</strong>
            <p>{product.validityDescription || "以支付后订单展示为准。"}</p>
          </div>
        </article>
        <article>
          <CalendarOutlined />
          <div>
            <strong>预约要求</strong>
            <p>
              {product.reservationRequired === "1"
                ? product.reservationNotice || "需要提前预约。"
                : "无需预约，可在有效期内使用。"}
            </p>
          </div>
        </article>
        <article>
          <UndoOutlined />
          <div>
            <strong>退款与过期</strong>
            <p>{product.refundExpiryRule || "按订单页展示的售后规则处理。"}</p>
          </div>
        </article>
        <article>
          <ShopOutlined />
          <div>
            <strong>履约方式</strong>
            <p>
              {product.supportsOffline === "1"
                ? "支付后生成核销码，到店或现场由订单所属商家核销。"
                : "该商品按快递配送履约。"}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
