import { LikeFilled, ZoomInOutlined } from '@ant-design/icons';
import { Button, Image, Tag } from 'antd';
import type { HomeFeedItemDto } from '@/services/shopContent';
import styles from '@/styles/commerce.less';

export function HomeFeedReportCard({
  item,
  onOpen,
  onUseful,
  onImageLoad,
  variant = 'grid',
}: {
  item: HomeFeedItemDto;
  onOpen: () => void;
  onUseful?: () => void;
  onImageLoad?: (key: string, width: number, height: number) => void;
  variant?: 'grid' | 'preview';
}) {
  if (!item.report) return null;
  const authorName = item.report.userName || '甄客';

  if (variant === 'preview') {
    return (
      <article className={styles.reportCard}>
        <div className={styles.reportImageButton}>
          <Image
            rootClassName={styles.reportPreviewImage}
            loading="lazy"
            src={item.coverUrl}
            alt={`${item.title}实拍`}
            preview={{
              mask: <span className={styles.imagePreviewMask}><ZoomInOutlined />点击放大</span>,
            }}
          />
        </div>
        <div className={styles.reportMeta}>
          <Tag color="green">甄客验</Tag>
          <strong>{authorName}</strong>
          <em>{item.publishedAt.slice(0, 10)}</em>
        </div>
        <h3>
          <button className={styles.reportProductLink} type="button" onClick={onOpen}>
            {item.title}
          </button>
        </h3>
        <p>{item.summary}</p>
        {item.report.shortcoming && <div className={styles.shortcoming}>优化建议：{item.report.shortcoming}</div>}
        <div className={styles.reportFooter}>
          <span>点击查看完整甄客验</span>
          <Button
            size="small"
            icon={<LikeFilled />}
            type={item.report.usefulByMe ? 'primary' : 'default'}
            onClick={(event) => {
              event.stopPropagation();
              onUseful?.();
            }}
          >
            {item.report.usefulCount} 有用
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
        <img
          loading="lazy"
          decoding="async"
          src={item.coverUrl}
          alt={`${item.title}实拍`}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth) img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            onImageLoad?.(`report-${item.contentId}`, img.naturalWidth, img.naturalHeight);
          }}
          onError={() => onImageLoad?.(`report-${item.contentId}`, 0, 0)}
        />
      </div>
      <div className={styles.reportGridContent}>
        <span className={styles.homeReportBadge}>甄客验</span>
        <p className={styles.reportGridTitle}>{item.title || item.summary}</p>
        <div className={styles.reportGridFooter}>
          <span className={styles.gridAuthor}>
            <span className={styles.gridAuthorAvatar}>{authorName.slice(0, 1)}</span>
            <span className={styles.gridAuthorName}>{authorName}</span>
          </span>
          <Button
            size="small"
            type="text"
            icon={<LikeFilled />}
            className={`${styles.usefulButton} ${item.report.usefulByMe ? styles.usefulActive : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onUseful?.();
            }}
          >
            {item.report.usefulCount}
          </Button>
        </div>
      </div>
    </article>
  );
}
