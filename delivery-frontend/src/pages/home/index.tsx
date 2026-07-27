import { Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { ReportCard } from '@/components/ReportCard';
import {
  fetchHomeFeed,
  fetchProductCategories,
  fetchPublishedReport,
  toggleReportUseful,
  type HomeFeedItemDto,
  type ProductCategoryDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import ReportDetailPage from '@/pages/reports/detail';
import ProductDetailPage from '@/pages/products/detail';
import OrdersPage from '@/pages/profile/orders';
import styles from '@/styles/commerce.less';

type CategoryFilter = ProductCategoryDto['categoryCode'] | null;

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, reports: myReports, replaceReport } = useShop();
  const [category, setCategory] = useState<CategoryFilter>(null);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [feed, setFeed] = useState<HomeFeedItemDto[]>([]);
  const [reports, setReports] = useState<VerificationReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const reportQuery = Number(searchParams.get('report'));
  const productQuery = Number(searchParams.get('product'));
  const paymentOrderId = Number(searchParams.get('wechatPayOrderId'));
  const isPaymentReturn = Number.isSafeInteger(paymentOrderId) && paymentOrderId > 0
    && ((searchParams.has('code') && searchParams.has('state'))
      || searchParams.get('wechatPayReturn') === '1');

  useEffect(() => {
    if (isPaymentReturn) return;
    let mounted = true;
    setLoading(true);
    const categoryCode = category ?? undefined;
    Promise.all([fetchHomeFeed(categoryCode, 'ALL', 'ALL'), fetchProductCategories()])
      .then(async ([feedResult, categoryRows]) => {
        const rows = Array.isArray(feedResult.rows) ? feedResult.rows : [];
        const reportIds = rows.filter((item) => item.contentType === 'REPORT').map((item) => item.contentId);
        const reportRows = await Promise.all(reportIds.map(fetchPublishedReport));
        if (!mounted) return;
        setFeed(rows);
        setCategories(categoryRows);
        setReports(reportRows);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '首页内容加载失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [category, isPaymentReturn]);

  const reportById = useMemo(
    () => new Map(reports.map((report) => [report.reportId, report])),
    [reports],
  );

  if (isPaymentReturn) {
    return <OrdersPage />;
  }
  if (Number.isSafeInteger(reportQuery) && reportQuery > 0) {
    return <ReportDetailPage reportId={reportQuery} />;
  }
  if (Number.isSafeInteger(productQuery) && productQuery > 0) {
    return <ProductDetailPage productId={productQuery} />;
  }

  const useful = async (report: VerificationReportDto) => {
    if (!user) {
      message.info('请先登录');
      navigate('/auth');
      return;
    }
    if (report.shopUserId === user.id) {
      message.warning('不能给自己的甄客验点有用');
      return;
    }
    try {
      const result = await toggleReportUseful(report.reportId);
      const updated = { ...report, ...result };
      setReports((items) => items.map((item) => item.reportId === report.reportId ? updated : item));
      if (myReports.some((item) => item.reportId === report.reportId)) replaceReport(updated);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  return (
    <main className={`${styles.singleColumn} ${styles.homeFeedPage}`}>
      <div className={styles.homeCategoryNav} aria-label="商品分类">
        {categories.map((item) => (
          <button
            key={item.categoryCode}
            type="button"
            className={category === item.categoryCode ? styles.homeCategoryActive : ''}
            aria-pressed={category === item.categoryCode}
            onClick={() => setCategory((current) => current === item.categoryCode ? null : item.categoryCode)}
          >
            {item.categoryName}
          </button>
        ))}
      </div>
      {loading && <div className={styles.sessionLoading}><Spin /></div>}
      <div className={styles.reportGrid}>
        {feed.map((item) => {
          if (item.contentType === 'REPORT') {
            const report = reportById.get(item.contentId);
            if (!report) return null;
            return (
              <ReportCard
                key={`report-${report.reportId}`}
                report={report}
                onOpen={() => navigate(`/reports/${report.reportId}`)}
                onUseful={() => void useful(report)}
              />
            );
          }
          if (!item.trial) return null;
          const remaining = Math.max(0, item.trial.targetCount - item.trial.approvedCount);
          const progress = item.trial.targetCount > 0
            ? Math.min(100, Math.round((item.trial.approvedCount / item.trial.targetCount) * 100))
            : 0;
          return (
            <article
              key={`trial-${item.contentId}`}
              className={styles.recruitGridCard}
              onClick={() => navigate(`/products/${item.productId}?campaign=${item.contentId}`)}
            >
              <div className={styles.reportGridImage}>
                <img src={item.coverUrl} alt={item.title} />
              </div>
              <div className={styles.reportGridContent}>
                <div className={styles.recruitBadge}>{item.trial.trialType === 'ONLINE' ? '线上试用' : '线下试用'}</div>
                <p className={styles.reportGridTitle}>{item.title}</p>
                <div className={styles.recruitGridMeta}>
                  <div className={styles.recruitProgressRow}>
                    <span className={styles.recruitProgressLabel}>已领取 {item.trial.approvedCount}/{item.trial.targetCount}</span>
                    <span className={styles.recruitRemainTag}>剩{remaining}</span>
                  </div>
                  <div className={styles.recruitProgressBar}><i style={{ width: `${progress}%` }} /></div>
                  <span className={styles.recruitDeadlineInline}>
                    截止 {item.trial.applicationDeadline.slice(5, 10).replace('-', '月')}日
                  </span>
                </div>
                <div className={styles.reportGridFooter}>
                  <span className={styles.gridAuthor}>
                    <span className={styles.gridMerchantAvatar}>{(item.merchantName || '店').slice(0, 1)}</span>
                    <span className={styles.gridAuthorName}>{item.merchantName}</span>
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!loading && feed.length === 0 && <p className={styles.empty}>当前分类还没有正在招募的试用或已发布的甄客验。</p>}
    </main>
  );
}
