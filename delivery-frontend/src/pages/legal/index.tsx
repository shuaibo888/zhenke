import { PLATFORM_OPERATOR } from '@/config/platformIdentity';
import { Link, useLocation } from 'umi';
import { AGREEMENT_UPDATED_DATE, agreementContent } from '@/config/agreements';
import { CUSTOMER_SUPPORT_EMAIL, CUSTOMER_SUPPORT_MAILTO } from '@/config/customerSupport';
import { ZkTaskHeader } from '@/components/ZkPage';
import { useSafeBack } from '@/hooks/useSafeBack';
import pageStyles from '@/styles/zhenke.less';
import styles from '@/styles/customerSupport.module.less';

export default function LegalPage() {
  const location = useLocation();
  const document = agreementContent[location.pathname === '/legal/privacy' ? 'privacy' : 'user'];
  const goBack = useSafeBack('/mall');
  return (
    <main className={`${pageStyles.page} ${styles.page}`}>
      <ZkTaskHeader title={document.title} onBack={goBack} />
      <article className={styles.document}>
        <p>平台运营方：{PLATFORM_OPERATOR}</p>
        <p className={styles.hint}>更新日期：{AGREEMENT_UPDATED_DATE}</p>
        {document.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.content}</p></section>)}
        <p>如有疑问，请联系 <a href={CUSTOMER_SUPPORT_MAILTO}>{CUSTOMER_SUPPORT_EMAIL}</a>。</p>
        <Link to="/support">客服与售后</Link>
      </article>
    </main>
  );
}
