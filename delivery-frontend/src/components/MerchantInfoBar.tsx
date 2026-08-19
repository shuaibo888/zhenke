import { RightOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';
import styles from '@/styles/commerce.less';

export function MerchantInfoBar({ merchantId, merchantName }: { merchantId: number; merchantName: string }) {
  const navigate = useNavigate();
  return (
    <section className={styles.merchantInfoBar} aria-label="内容所属商家">
      <button
        type="button"
        className={styles.merchantInfoMain}
        onClick={() => navigate(`/merchants/${merchantId}`)}
      >
        <span className={styles.merchantInfoIcon}><ShopOutlined /></span>
        <span className={styles.merchantInfoCopy}>
          <small>商家</small>
          <strong>{merchantName}</strong>
        </span>
        <RightOutlined className={styles.merchantInfoArrow} />
      </button>
    </section>
  );
}
