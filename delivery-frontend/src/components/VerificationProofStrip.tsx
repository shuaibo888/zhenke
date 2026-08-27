import {
  CheckCircleFilled,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { VerificationReportDto } from "@/services/shopContent";
import styles from "@/styles/zhenke.less";

export function VerificationProofStrip({
  report,
}: {
  report: VerificationReportDto;
}) {
  const source =
    report.reportSource === "PURCHASE"
      ? "真实订单完成后发布"
      : report.trialType === "OFFLINE"
        ? "线下试用核销后发布"
        : "线上试用收货后发布";
  return (
    <aside className={styles.verificationProof} aria-label="甄客验可信来源">
      <span className={styles.verificationProofIcon}>
        <SafetyCertificateOutlined />
      </span>
      <div>
        <small>甄客验 · 资格型真实体验</small>
        <strong>{source}</strong>
        <p>这篇体验与已完成的订单或试用记录相关。</p>
      </div>
      <em>
        <CheckCircleFilled /> 资格已确认
      </em>
    </aside>
  );
}
