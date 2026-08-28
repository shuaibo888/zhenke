import {
  ArrowLeftOutlined,
  DisconnectOutlined,
  InboxOutlined,
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

export function ZkTaskHeader(props: {
  eyebrow: string;
  title: string;
  description: string;
  backTo?: string;
  aside?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className={styles.taskHeader}>
      <button
        type="button"
        className={styles.taskHeaderBack}
        onClick={() => navigate(props.backTo ?? "/profile")}
        aria-label="返回"
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
  const icon =
    kind === "loading" ? (
      <LoadingOutlined />
    ) : kind === "error" ? (
      <DisconnectOutlined />
    ) : (
      <InboxOutlined />
    );
  return (
    <div
      className={styles.statePanel}
      role={kind === "error" ? "alert" : "status"}
    >
      <div className={styles.stateContent}>
        <span className={styles.stateIcon}>
          {kind === "loading" ? <Spin indicator={icon} /> : icon}
        </span>
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
