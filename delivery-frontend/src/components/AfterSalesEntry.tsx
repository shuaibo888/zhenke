import { Link } from 'umi';
import styles from '@/styles/customerSupport.module.less';

export function AfterSalesEntry({ merchantId }: { merchantId?: number }) {
  return (
    <nav className={styles.entry} aria-label="客户服务">
      <Link to={merchantId && merchantId > 0 ? `/support?merchantId=${merchantId}` : '/support'}>客服与售后</Link>
      {!merchantId && <><Link to="/legal/user">用户协议</Link><Link to="/legal/privacy">隐私政策</Link></>}
    </nav>
  );
}
