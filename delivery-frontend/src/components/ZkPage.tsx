import {
  ArrowLeftOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { Button, Spin } from "antd";
import type { ReactNode } from "react";
import { useNavigate } from "umi";
import styles from "@/styles/zhenke.less";

export function ZkPageHeader(props: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderCopy}>
        {props.eyebrow && (
          <span className={styles.eyebrow}>{props.eyebrow}</span>
        )}
        <h1>{props.title}</h1>
        {props.description && <p>{props.description}</p>}
      </div>
      {props.action}
    </header>
  );
}

export function ZkSectionTitle(props: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.sectionTitle}>
      <div>
        <h2>{props.title}</h2>
        {props.description && <p>{props.description}</p>}
      </div>
      {props.action}
    </div>
  );
}

export function ZkProfilePage(props: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`${styles.page} ${styles.profileSubPage} ${props.className ?? ""}`}>
      {props.children}
    </main>
  );
}

export function ZkProfilePanel(props: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section className={`${styles.surface} ${styles.profileCollectionPanel} ${props.className ?? ""}`}>
      {(props.title || props.meta) && (
        <div className={styles.profileCollectionMeta}>
          <strong>{props.title}</strong>
          {props.meta && <span>{props.meta}</span>}
        </div>
      )}
      {props.children}
    </section>
  );
}

export function ZkTaskHeader(props: {
  eyebrow: string;
  title: string;
  description: string;
  backTo?: string;
  onBack?: () => void;
  backAriaLabel?: string;
  aside?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className={styles.taskHeader}>
      <button
        type="button"
        className={styles.taskHeaderBack}
        onClick={props.onBack ?? (() => navigate(props.backTo ?? "/profile"))}
        aria-label={props.backAriaLabel ?? "返回"}
      >
        <ArrowLeftOutlined />
      </button>
      <div className={styles.taskHeaderCopy}>
        <span>{props.eyebrow}</span>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>
      {props.aside && (
        <div className={styles.taskHeaderAside}>{props.aside}</div>
      )}
    </header>
  );
}

export function ZkState(props: {
  kind?: "loading" | "empty" | "error";
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  const kind = props.kind ?? "empty";
  return (
    <div
      className={styles.statePanel}
      role={kind === "error" ? "alert" : "status"}
    >
      <div className={styles.stateContent}>
        {kind === "loading" && (
          <span className={styles.stateIcon}>
            <Spin indicator={<LoadingOutlined />} />
          </span>
        )}
        <h3>
          {props.title ??
            (kind === "loading"
              ? "正在加载"
              : kind === "error"
                ? "暂时无法加载"
                : "暂无内容")}
        </h3>
        {props.description && <p>{props.description}</p>}
        {props.onAction && (
          <Button type="primary" onClick={props.onAction}>
            {props.actionText ?? "重试"}
          </Button>
        )}
      </div>
    </div>
  );
}
