import { CheckCircleFilled, CheckCircleOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import type { VerificationReportDto } from '@/services/shopContent';
import { getReportType } from '@/utils/shop';
import styles from '@/styles/commerce.less';

export function ReportCard({
  report,
  onOpen,
  onUseful,
  usefulDisabled = false,
  variant = 'grid',
}: {
  report: VerificationReportDto;
  onOpen: () => void;
  onUseful?: () => void;
  usefulDisabled?: boolean;
  variant?: 'grid' | 'detail';
}) {
  const type = getReportType(report);
  const image = report.resources?.find((item) => item.resourceType === 'IMAGE')?.resourceUrl
    || report.productCoverUrl;
  const authorName = report.nickName || report.userName;

  if (variant === 'detail') {
    return (
      <article className={styles.reportCard}>
        <button className={styles.reportImageButton} type="button" onClick={onOpen}>
          <img src={image} alt={`${report.productName}实拍`} />
        </button>
        <div className={styles.reportMeta}>
          <Tag color={type.color}>{type.label}</Tag>
          <strong>{authorName}</strong>
          <em>{report.publishedAt}</em>
        </div>
        <h3>
          <button className={styles.reportProductLink} type="button" onClick={onOpen}>
            {report.title || report.productName}
          </button>
        </h3>
        <p>{report.experience}</p>
        <div className={styles.shortcoming}>优化建议：{report.shortcoming}</div>
        <div className={styles.reportFooter}>
          <span>查看完整真实体验</span>
          <Button
            size="small"
            icon={report.usefulByMe ? <CheckCircleFilled /> : <CheckCircleOutlined />}
            type={report.usefulByMe ? 'primary' : 'default'}
            disabled={usefulDisabled}
            title={usefulDisabled ? '自己的甄客验仅展示有用人数' : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onUseful?.();
            }}
          >
            有用 {report.usefulCount}
          </Button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={styles.reportGridCard}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={styles.reportGridImage}>
        <img src={image} alt={`${report.productName}实拍`} />
      </div>
      <div className={styles.reportGridContent}>
        <span className={styles.homeReportBadge}>甄客验</span>
        <p className={styles.reportGridTitle}>{report.title || report.experience}</p>
        <div className={styles.reportGridFooter}>
          <span className={styles.gridAuthor}>
            <span className={styles.gridAuthorAvatar}>{(authorName || '甄').slice(0, 1)}</span>
            <span className={styles.gridAuthorName}>{authorName}</span>
          </span>
          <Button
            size="small"
            type="text"
            icon={report.usefulByMe ? <CheckCircleFilled /> : <CheckCircleOutlined />}
            className={`${styles.usefulButton} ${report.usefulByMe ? styles.usefulActive : ''}`}
            disabled={usefulDisabled}
            title={usefulDisabled ? '自己的甄客验仅展示有用人数' : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onUseful?.();
            }}
          >
            有用 {report.usefulCount}
          </Button>
        </div>
      </div>
    </article>
  );
}
