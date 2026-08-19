import {
  ArrowLeftOutlined,
  BankOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'umi';
import {
  fetchPublicMerchant,
  type PublicMerchantDto,
} from '@/services/shopContent';
import styles from '@/styles/commerce.less';
import { openMerchantNavigation } from '@/utils/merchantNavigation';

export default function MerchantDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const merchantId = Number(params.merchantId);
  const [merchant, setMerchant] = useState<PublicMerchantDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingNavigation, setOpeningNavigation] = useState(false);

  const handleNavigation = async () => {
    if (!merchant || openingNavigation) return;
    setOpeningNavigation(true);
    try {
      await openMerchantNavigation(merchant);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导航打开失败');
    } finally {
      setOpeningNavigation(false);
    }
  };

  useEffect(() => {
    if (!Number.isSafeInteger(merchantId) || merchantId <= 0) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetchPublicMerchant(merchantId)
      .then((result) => {
        if (mounted) setMerchant(result);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '商家详情加载失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [merchantId]);

  if (loading) return <main className={styles.sessionLoading}><Spin size="large" /></main>;
  if (!merchant) {
    return <main className={styles.singleColumn}><p className={styles.empty}>商家不存在或暂不可访问。</p></main>;
  }

  return (
    <main className={`${styles.journeyPage} ${styles.merchantDetailPage}`}>
      <header className={styles.reportDetailBar}>
        <button type="button" className={styles.reportDetailBack} aria-label="返回" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined />
        </button>
        <span className={styles.trialDetailTitle}>商家详情</span>
        <span className={styles.merchantDetailHeaderPlaceholder} />
      </header>

      <section className={styles.merchantDetailHero}>
        <span className={styles.merchantDetailLogo}><ShopOutlined /></span>
        <div>
          <small>实体商家</small>
          <h1>{merchant.shopName}</h1>
        </div>
      </section>

      <section className={styles.merchantDetailPanel}>
        <h2>商家资质与联系信息</h2>
        <dl className={styles.merchantDetailList}>
          <div>
            <dt><BankOutlined />营业执照主体名称</dt>
            <dd>{merchant.companyName}</dd>
          </div>
          <div>
            <dt><IdcardOutlined />统一社会信用代码</dt>
            <dd>{merchant.companyCreditCode}</dd>
          </div>
          <div>
            <dt><SafetyCertificateOutlined />法定代表人/经营者</dt>
            <dd>{merchant.legalPerson}</dd>
          </div>
          <div>
            <dt><TeamOutlined />商家联系人</dt>
            <dd>{merchant.contactName}</dd>
          </div>
          <div>
            <dt><PhoneOutlined />联系电话</dt>
            <dd><a href={`tel:${merchant.contactPhone}`}>{merchant.contactPhone}</a></dd>
          </div>
          <div>
            <dt><EnvironmentOutlined />实体店地址</dt>
            <dd>{merchant.storeAddress}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.merchantVisitCard}>
        <div className={styles.merchantVisitCopy}>
          <span><EnvironmentOutlined /></span>
          <div>
            <strong>前往实体店</strong>
            <small>{merchant.storeAddress}</small>
          </div>
        </div>
        <button
          type="button"
          className={styles.merchantDetailNavigate}
          onClick={() => void handleNavigation()}
          disabled={openingNavigation}
        >
          <CompassOutlined />
          <span>{openingNavigation ? '正在打开…' : '导航到店'}</span>
        </button>
      </section>

    </main>
  );
}
