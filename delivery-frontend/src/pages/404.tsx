import { Button } from 'antd';
import { useNavigate } from 'umi';
import styles from '@/styles/commerce.less';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className={styles.authShell}>
      <section className={styles.authCard}>
        <h1>页面不存在</h1>
        <p>链接可能已失效，或者页面地址有误。</p>
        <Button block type="primary" onClick={() => navigate('/')}>返回首页</Button>
      </section>
    </main>
  );
}
