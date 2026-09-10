import { StoreProductCard } from '@/components/StoreProductCard';
import {
  ArrowLeftOutlined,
  BankOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { ReportCard } from '@/components/ReportCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import { useSafeBack } from '@/hooks/useSafeBack';
import {
  fetchMallProducts,
  fetchPublicMerchant,
  fetchPublicMerchantReports,
  toggleReportUseful,
  type MallProductDto,
  type PublicMerchantDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import { openMerchantNavigation } from '@/utils/merchantNavigation';
import { buildLoginPath, LOGIN_RETURN_TO_SOURCE_STATE } from '@/utils/safeRedirect';
import styles from '@/styles/zhenke.less';
import presentation from '@/styles/storefront.module.less';

export default function MerchantDetailPage() {
  const navigate = useNavigate();
  const { user } = useShop();
  const goBack = useSafeBack('/mall');
  const { merchantId: rawMerchantId } = useParams<{ merchantId: string }>();
  const merchantId = Number(rawMerchantId);
  const [merchant, setMerchant] = useState<PublicMerchantDto>();
  const [products, setProducts] = useState<MallProductDto[]>([]);
  const [reports, setReports] = useState<VerificationReportDto[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productsError, setProductsError] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [openingNavigation, setOpeningNavigation] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setProductsError('');
    setReportsError('');
    try {
      const [merchantResult, productResult, reportResult] = await Promise.allSettled([
        fetchPublicMerchant(merchantId),
        fetchMallProducts({ merchantId, pageNum: 1, pageSize: 12 }),
        fetchPublicMerchantReports(merchantId, 1, 6),
      ]);
      if (merchantResult.status === 'fulfilled') {
        setMerchant(merchantResult.value);
      } else {
        setMerchant(undefined);
        setError(merchantResult.reason instanceof Error ? merchantResult.reason.message : '商家不存在或暂不可访问');
      }
      if (productResult.status === 'fulfilled') {
        setProducts(productResult.value.rows);
      } else {
        setProducts([]);
        setProductsError(productResult.reason instanceof Error ? productResult.reason.message : '商家商品暂时无法加载');
      }
      if (reportResult.status === 'fulfilled') {
        setReports(reportResult.value.rows);
        setReportTotal(reportResult.value.total);
      } else {
        setReports([]);
        setReportTotal(0);
        setReportsError(reportResult.reason instanceof Error ? reportResult.reason.message : '商家甄客验暂时无法加载');
      }
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    if (Number.isSafeInteger(merchantId) && merchantId > 0) void load();
    else {
      setLoading(false);
      setError('商家链接无效');
    }
  }, [load, merchantId]);

  if (loading) return <main className={styles.page}><ZkState kind="loading" title="正在打开商家" /></main>;
  if (!merchant || error) {
    return (
      <main className={styles.page}>
        <ZkState
          kind="error"
          title="商家暂不可访问"
          description={error}
          actionText={Number.isSafeInteger(merchantId) && merchantId > 0 ? '重新加载' : '返回商城'}
          onAction={Number.isSafeInteger(merchantId) && merchantId > 0 ? () => void load() : () => navigate('/mall')}
        />
        {Number.isSafeInteger(merchantId) && merchantId > 0 && <Button block onClick={() => navigate('/mall')}>返回商城</Button>}
      </main>
    );
  }

  const navigateToStore = async () => {
    if (openingNavigation) return;
    setOpeningNavigation(true);
    try {
      await openMerchantNavigation(merchant);
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '暂时无法打开导航');
    } finally {
      setOpeningNavigation(false);
    }
  };

  const toggleUseful = async (report: VerificationReportDto) => {
    if (!user) {
      navigate(buildLoginPath(`/merchants/${merchantId}`), { state: LOGIN_RETURN_TO_SOURCE_STATE });
      return;
    }
    if (report.shopUserId === user.id) return;
    try {
      const next = await toggleReportUseful(report.reportId);
      setReports((current) => current.map((item) => (
        item.reportId === report.reportId
          ? { ...item, usefulByMe: next.usefulByMe, usefulCount: next.usefulCount }
          : item
      )));
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '“有用”状态更新失败');
    }
  };

  return (
    <main className={`${styles.page} ${presentation.merchantPage}`}>
      <div className={styles.detailTopbar}>
        <button type="button" className={styles.backButton} onClick={goBack} aria-label="返回">
          <ArrowLeftOutlined />
        </button>
        <strong>商家详情</strong>
      </div>

      <section className={presentation.merchantHero}>
        <h1>{merchant.shopName}</h1>
        <p>{merchant.storeAddress}</p>
        <div className={presentation.merchantActions}>
          {merchant.contactPhone && <a href={`tel:${merchant.contactPhone}`}><PhoneOutlined /> 联系商家</a>}
          <Button type="text" icon={<CompassOutlined />} loading={openingNavigation} onClick={() => void navigateToStore()}>导航到店</Button>
          <Link to={`/support?merchantId=${merchantId}`}>客服与售后</Link>
        </div>
      </section>

      <details className={presentation.credentials}>
        <summary>商家公开信息与资质</summary>
        <div className={styles.profileEntryGrid}>
          <div className={styles.profileEntry}><span className={styles.profileEntryIcon}><BankOutlined /></span><span className={styles.profileEntryCopy}><strong>营业执照主体</strong><small>{merchant.companyName}</small></span></div>
          <div className={styles.profileEntry}><span className={styles.profileEntryIcon}><IdcardOutlined /></span><span className={styles.profileEntryCopy}><strong>统一社会信用代码</strong><small>{merchant.companyCreditCode}</small></span></div>
          <div className={styles.profileEntry}><span className={styles.profileEntryIcon}><SafetyCertificateOutlined /></span><span className={styles.profileEntryCopy}><strong>法定代表人 / 经营者</strong><small>{merchant.legalPerson}</small></span></div>
          <div className={styles.profileEntry}><span className={styles.profileEntryIcon}><TeamOutlined /></span><span className={styles.profileEntryCopy}><strong>商家联系人</strong><small>{merchant.contactName}</small></span></div>
          <a className={styles.profileEntry} href={`tel:${merchant.contactPhone}`}><span className={styles.profileEntryIcon}><PhoneOutlined /></span><span className={styles.profileEntryCopy}><strong>联系电话</strong><small>{merchant.contactPhone}</small></span></a>
          <button type="button" className={styles.profileEntry} onClick={() => void navigateToStore()}><span className={styles.profileEntryIcon}><EnvironmentOutlined /></span><span className={styles.profileEntryCopy}><strong>实体店地址</strong><small>{merchant.storeAddress}</small></span></button>
        </div>
      </details>

      <ZkSectionTitle title="在售商品" />
      {productsError ? (
        <ZkState
          kind="error"
          title="商家信息可用，在售商品暂未加载"
          description={productsError}
          onAction={() => void load()}
        />
      ) : products.length === 0 ? (
        <ZkState title="暂无在售商品" />
      ) : (
        <div className={presentation.productGrid}>
          {products.map((product) => (
            <StoreProductCard key={product.productId} product={product} showMerchant={false} />
          ))}
        </div>
      )}

      <ZkSectionTitle
        title="甄客验"
        description={reportTotal > 0 ? `${reportTotal} 篇体验` : undefined}
      />
      {reportsError ? (
        <ZkState
          kind="error"
          title="商家信息可用，甄客验暂未加载"
          description={reportsError}
          onAction={() => void load()}
        />
      ) : reports.length === 0 ? (
        <ZkState title="暂无公开甄客验" />
      ) : (
        <div className={styles.merchantReportGrid}>
          {reports.map((report) => (
            <ReportCard
              key={report.reportId}
              report={report}
              onOpen={() => navigate(`/reports/${report.reportId}`)}
              onUseful={() => void toggleUseful(report)}
              usefulDisabled={report.shopUserId === user?.id}
            />
          ))}
        </div>
      )}
    </main>
  );
}
