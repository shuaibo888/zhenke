import { ArrowLeftOutlined } from '@ant-design/icons';
import styles from '@/styles/commerce.less';

interface ProfileBackButtonProps {
  onClick: () => void;
}

export function ProfileBackButton({ onClick }: ProfileBackButtonProps) {
  return (
    <button
      type="button"
      className={styles.profileBackButton}
      aria-label="返回我的页面"
      onClick={onClick}
    >
      <span className={styles.profileBackIcon} aria-hidden="true">
        <ArrowLeftOutlined />
      </span>
      <span className={styles.profileBackText}>返回我的</span>
    </button>
  );
}
