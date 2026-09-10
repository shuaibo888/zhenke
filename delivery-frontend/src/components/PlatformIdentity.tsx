import { PLATFORM_ICP_LOOKUP_URL, PLATFORM_ICP_NUMBER, PLATFORM_OPERATOR } from '@/config/platformIdentity';
import styles from '@/styles/customerSupport.module.less';

export function PlatformIdentity() {
  return (
    <div className={styles.identity} aria-label="平台运营与备案信息">
      <span>{PLATFORM_OPERATOR}</span>
      <a href={PLATFORM_ICP_LOOKUP_URL} target="_blank" rel="noopener noreferrer">{PLATFORM_ICP_NUMBER}</a>
    </div>
  );
}
