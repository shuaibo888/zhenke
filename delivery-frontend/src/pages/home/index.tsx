import { Button, Spin, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { HomeFeedReportCard } from '@/components/HomeFeedReportCard';
import { MasonryFeed } from '@/components/MasonryFeed';
import {
  fetchHomeFeed,
  fetchProductCategories,
  searchHomeFeed,
  toggleReportUseful,
  type HomeFeedItemDto,
  type ProductCategoryDto,
} from '@/services/shopContent';
import ReportDetailPage from '@/pages/reports/detail';
import ProductDetailPage from '@/pages/products/detail';
import styles from '@/styles/commerce.less';

type CategoryFilter = ProductCategoryDto['categoryCode'] | null;
const HOME_PAGE_SIZE = 12;

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useShop();
  const [category, setCategory] = useState<CategoryFilter>(null);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [feed, setFeed] = useState<HomeFeedItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(0);
  const [total, setTotal] = useState(0);
  const loadMoreTrigger = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const requestVersion = useRef(0);
  // 瀑布流：记录每张封面的真实宽高比，图片加载后触发头部重排（settle）。
  const ratioMapRef = useRef<Record<string, { w: number; h: number }>>({});
  const [revision, setRevision] = useState(0);

  const handleImageLoad = useCallback((key: string, width: number, height: number) => {
    ratioMapRef.current[key] = { w: width || 1, h: height || 1 };
    setRevision((value) => value + 1);
  }, []);

  const estimateHeight = useCallback((key: string | null, columnWidth: number) => {
    const ratio = key ? ratioMapRef.current[key] : undefined;
    const imageHeight = ratio ? (columnWidth * ratio.h) / ratio.w : columnWidth;
    return imageHeight + (key?.startsWith('trial-') ? 148 : 112);
  }, []);

  const reportQuery = Number(searchParams.get('report'));
  const productQuery = Number(searchParams.get('product'));
  const paymentOrderId = Number(searchParams.get('wechatPayOrderId'));
  const keyword = (searchParams.get('keyword') ?? '').trim();
  const contentParam = searchParams.get('content')?.toUpperCase();
  const contentType = contentParam === 'REPORT' || contentParam === 'TRIAL' ? contentParam : 'ALL';
  const searchMode = keyword.length > 0;
  const isPaymentReturn = Number.isSafeInteger(paymentOrderId) && paymentOrderId > 0
    && ((searchParams.has('code') && searchParams.has('state'))
      || searchParams.get('wechatPayReturn') === '1');
  const showingDirectContent = isPaymentReturn
    || (Number.isSafeInteger(reportQuery) && reportQuery > 0)
    || (Number.isSafeInteger(productQuery) && productQuery > 0);

  useEffect(() => {
    if (showingDirectContent) return;
    let mounted = true;
    fetchProductCategories()
      .then((rows) => {
        if (mounted) setCategories(rows);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '商品分类加载失败');
      });
    return () => {
      mounted = false;
    };
  }, [showingDirectContent]);

  useEffect(() => {
    if (showingDirectContent) return;
    const version = ++requestVersion.current;
    setLoading(true);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setFeed([]);
    setLoadedPage(0);
    setTotal(0);
    const firstPageRequest = searchMode
      ? searchHomeFeed({ keyword, pageNum: 1, pageSize: HOME_PAGE_SIZE })
      : fetchHomeFeed({
        categoryCode: category ?? undefined,
        contentType,
        trialType: 'ALL',
        pageNum: 1,
        pageSize: HOME_PAGE_SIZE,
      });
    firstPageRequest
      .then((result) => {
        if (requestVersion.current !== version) return;
        setFeed(Array.isArray(result.rows) ? result.rows : []);
        setTotal(result.total);
        setLoadedPage(1);
      })
      .catch((error) => {
        if (requestVersion.current === version) {
          message.error(error instanceof Error ? error.message : '首页内容加载失败');
        }
      })
      .finally(() => {
        if (requestVersion.current === version) setLoading(false);
      });
  }, [category, contentType, keyword, searchMode, showingDirectContent]);

  const loadMore = useCallback(async () => {
    if (showingDirectContent || loading || loadingMoreRef.current || loadedPage < 1 || feed.length >= total) return;
    const version = requestVersion.current;
    const nextPage = loadedPage + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = searchMode
        ? await searchHomeFeed({ keyword, pageNum: nextPage, pageSize: HOME_PAGE_SIZE })
        : await fetchHomeFeed({
          categoryCode: category ?? undefined,
          contentType,
          trialType: 'ALL',
          pageNum: nextPage,
          pageSize: HOME_PAGE_SIZE,
        });
      if (requestVersion.current !== version) return;
      setFeed((current) => {
        const existing = new Set(current.map((item) => `${item.contentType}-${item.contentId}`));
        return [...current, ...result.rows.filter((item) => !existing.has(`${item.contentType}-${item.contentId}`))];
      });
      setTotal(result.total);
      setLoadedPage(nextPage);
    } catch (error) {
      if (requestVersion.current === version) {
        message.error(error instanceof Error ? error.message : '更多内容加载失败');
      }
    } finally {
      if (requestVersion.current === version) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [category, contentType, feed.length, keyword, loadedPage, loading, searchMode, showingDirectContent, total]);

  useEffect(() => {
    const target = loadMoreTrigger.current;
    if (!target || feed.length >= total || loading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [feed.length, loadMore, loading, total]);

  if (isPaymentReturn) {
    const paymentParams = new URLSearchParams(searchParams);
    paymentParams.set('orderId', String(paymentOrderId));
    return <Navigate to={`/checkout?${paymentParams.toString()}`} replace />;
  }
  if (Number.isSafeInteger(reportQuery) && reportQuery > 0) {
    return <ReportDetailPage reportId={reportQuery} />;
  }
  if (Number.isSafeInteger(productQuery) && productQuery > 0) {
    return <ProductDetailPage productId={productQuery} />;
  }

  const useful = async (item: HomeFeedItemDto) => {
    if (!item.report) return;
    if (!user) {
      message.info('请先登录');
      navigate('/auth');
      return;
    }
    if (item.report.shopUserId === user.id) {
      message.warning('不能给自己的甄客验点有用');
      return;
    }
    try {
      const result = await toggleReportUseful(item.contentId);
      setFeed((items) => items.map((current) => (
        current.contentType === 'REPORT' && current.contentId === item.contentId && current.report
          ? { ...current, report: { ...current.report, ...result } }
          : current
      )));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const cards = feed.map((item) => {
    if (item.contentType === 'REPORT') {
      if (!item.report) return null;
      return (
        <HomeFeedReportCard
          key={`report-${item.contentId}`}
          item={item}
          onOpen={() => navigate(`/reports/${item.contentId}`)}
          onUseful={() => void useful(item)}
          onImageLoad={handleImageLoad}
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
          <img
            loading="lazy"
            decoding="async"
            src={item.coverUrl}
            alt={item.title}
            onLoad={(event) => {
              const img = event.currentTarget;
              if (img.naturalWidth) img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
              handleImageLoad(`trial-${item.contentId}`, img.naturalWidth, img.naturalHeight);
            }}
            onError={() => handleImageLoad(`trial-${item.contentId}`, 0, 0)}
          />
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
  }).filter((card): card is NonNullable<typeof card> => card != null);

  return (
    <main className={`${styles.singleColumn} ${styles.homeFeedPage}`}>
      {searchMode ? (
        <div className={styles.homeSearchSummary}>
          <span>全局搜索</span>
          <strong>“{keyword}”</strong>
          {!loading && <em>共 {total} 条</em>}
          <button type="button" onClick={() => navigate('/')}>清除搜索</button>
        </div>
      ) : (
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
      )}
      {loading && <div className={styles.sessionLoading}><Spin /></div>}
      <MasonryFeed
        gap={10}
        estimateHeight={estimateHeight}
        revision={revision}
      >
        {cards}
      </MasonryFeed>
      {!loading && feed.length === 0 && (
        <p className={styles.empty}>
          {searchMode
            ? `没有找到与“${keyword}”相关的试用或甄客验。`
            : contentType === 'REPORT'
              ? '当前分类还没有推荐到首页的甄客验。'
              : contentType === 'TRIAL'
                ? '当前分类还没有正在招募的试用。'
                : '当前分类还没有正在招募的试用或已发布的甄客验。'}
        </p>
      )}
      {!loading && feed.length < total && (
        <div ref={loadMoreTrigger} className={styles.homeLoadMore}>
          <Button loading={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? '正在加载' : '加载更多'}
          </Button>
        </div>
      )}
    </main>
  );
}
