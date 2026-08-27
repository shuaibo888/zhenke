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
        <p>
          发布资格由服务端依据订单、试用、收货或核销状态确认，与用户主动发布的甄客帖不同。
        </p>
      </div>
      <em>
        <CheckCircleFilled /> 已形成资格链路
      </em>
    </aside>
  );
}
