import { LikeFilled } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import type { VerificationReportDto } from '@/services/shopContent';
import { getReportType } from '@/utils/shop';
import styles from '@/styles/commerce.less';

export function ReportCard({
  report,
  onOpen,
  onUseful,
  variant = 'grid',
}: {
  report: VerificationReportDto;
  onOpen: () => void;
  onUseful?: () => void;
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
        <div className={styles.shortcoming}>不足：{report.shortcoming}</div>
        <div className={styles.reportFooter}>
          <span>适合：{report.fitCrowd}</span>
          <Button
            size="small"
            icon={<LikeFilled />}
            type={report.usefulByMe ? 'primary' : 'default'}
            onClick={(event) => {
              event.stopPropagation();
              onUseful?.();
            }}
          >
            {report.usefulCount} 有用
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
            icon={<LikeFilled />}
            className={`${styles.usefulButton} ${report.usefulByMe ? styles.usefulActive : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onUseful?.();
            }}
          >
            {report.usefulCount}
          </Button>
        </div>
      </div>
    </article>
  );
}
