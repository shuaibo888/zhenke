import { useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import styles from '@/styles/commerce.less';

export function WechatShareGuide({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className={styles.wechatShareGuide}
      role="dialog"
      aria-modal="true"
      aria-label="微信分享提示"
      onClick={onClose}
    >
      <div className={styles.wechatShareGuidePointer} aria-hidden="true">
        <svg viewBox="0 0 132 116" role="presentation">
          <path d="M10 105C48 94 80 65 108 22" />
          <path d="M85 29L111 18L108 46" />
        </svg>
      </div>
      <div className={styles.wechatShareGuideCopy} onClick={(event) => event.stopPropagation()}>
        <strong>点击右上角“···”</strong>
        <span>选择“发送给朋友”或“分享到朋友圈”</span>
        <button type="button" onClick={onClose}>我知道了</button>
      </div>
    </div>
  );
}
