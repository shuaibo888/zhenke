import {
  CoffeeOutlined,
  CompassOutlined,
  HomeOutlined,
  RightOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { HomeFeedReportCard } from '@/components/HomeFeedReportCard';
import { ZkState } from '@/components/ZkPage';
import { StoreProductCard } from '@/components/StoreProductCard';
import {
  fetchHomeFeed,
  fetchMallProducts,
  fetchProductCategories,
  toggleReportUseful,
  type HomeFeedItemDto,
  type MallProductDto,
} from '@/services/shopContent';
import { buildLoginPath, LOGIN_RETURN_TO_SOURCE_STATE } from '@/utils/safeRedirect';
import styles from '@/styles/zhenke.less';
import presentation from '@/styles/storefront.module.less';
import { BUSINESS_MODULES, normalizeBusinessModule, type BusinessModuleCode } from './modules';

const PREVIEW_SIZE = 4;
const moduleIcons: Record<BusinessModuleCode, React.ReactNode> = {
  MALL: <ShoppingOutlined />,
  ZHENKE_HOTEL: <HomeOutlined />,
  ZHENKE_SCENIC: <CompassOutlined />,
  ZHENKE_RESTAURANT: <CoffeeOutlined />,
};

export default function MallPage() {
  const navigate = useNavigate();
  const { user } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = normalizeBusinessModule(searchParams.get('module') ?? searchParams.get('scene'));
  const moduleTitle = BUSINESS_MODULES.find((item) => item.code === activeModule)!.title;
  const [products, setProducts] = useState<MallProductDto[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [feed, setFeed] = useState<HomeFeedItemDto[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const requestVersionRef = useRef(0);
  const feedRequestVersionRef = useRef(0);

  const legacyView = searchParams.get('view');
  const legacyModule = searchParams.get('module') ?? searchParams.get('scene');
  const legacyCategory = searchParams.get('category');
  const legacyKeyword = searchParams.get('keyword');
  const legacyContent = searchParams.get('content');
  const legacyTarget = (() => {
    if (legacyView === 'feed') {
      const next = new URLSearchParams();
      next.set('module', activeModule);
      if (legacyContent) next.set('content', legacyContent);
      if (legacyKeyword) next.set('keyword', legacyKeyword);
      const query = next.toString();
      return `/mall/content${query ? `?${query}` : ''}`;
    }
    if (legacyView === 'list' || legacyCategory || legacyKeyword
      || (legacyModule && !BUSINESS_MODULES.some((item) => item.code === legacyModule))) {
      const next = new URLSearchParams();
      if (legacyModule) next.set('module', legacyModule);
      if (legacyCategory) next.set('category', legacyCategory);
      if (legacyKeyword) next.set('keyword', legacyKeyword);
      const query = next.toString();
      return `/mall/products${query ? `?${query}` : ''}`;
    }
    return '';
  })();

  const loadProducts = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    setProductsLoading(true);
    setProductsError('');
    setProducts([]);
    setProductTotal(0);
    try {
      const category = activeModule === 'MALL' ? undefined
        : (await fetchProductCategories()).find((item) => item.categoryCode === activeModule);
      if (requestVersion !== requestVersionRef.current) return;
      if (activeModule !== 'MALL' && !category) return;
      const result = await fetchMallProducts({
        businessModule: activeModule === 'MALL' ? 'MALL' : undefined,
        categoryId: category?.categoryId,
        pageNum: 1, pageSize: PREVIEW_SIZE,
      });
      if (requestVersion !== requestVersionRef.current) return;
      setProducts(result.rows.slice(0, PREVIEW_SIZE));
      setProductTotal(result.total);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setProductsError(reason instanceof Error ? reason.message : '商城商品加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setProductsLoading(false);
    }
  }, [activeModule]);

  const loadFeed = useCallback(async () => {
    const requestVersion = ++feedRequestVersionRef.current;
    setFeedLoading(true);
    setFeedError('');
    setFeed([]);
    try {
      const result = await fetchHomeFeed({
        businessModule: activeModule === 'MALL' ? 'MALL' : undefined,
        categoryCode: activeModule === 'MALL' ? undefined : activeModule,
        contentType: 'ALL',
        trialType: 'ALL',
        pageNum: 1,
        pageSize: PREVIEW_SIZE,
      });
      if (requestVersion === feedRequestVersionRef.current) setFeed(result.rows.slice(0, PREVIEW_SIZE));
    } catch (reason) {
      if (requestVersion !== feedRequestVersionRef.current) return;
      setFeedError(reason instanceof Error ? reason.message : '试用与甄客验加载失败');
    } finally {
      if (requestVersion === feedRequestVersionRef.current) setFeedLoading(false);
    }
  }, [activeModule]);

  useEffect(() => {
    if (legacyTarget) return;
    void loadProducts();
    void loadFeed();
    return () => {
      requestVersionRef.current += 1;
      feedRequestVersionRef.current += 1;
    };
  }, [legacyTarget, loadProducts, loadFeed]);

  const openModule = (code: BusinessModuleCode) => {
    if (code === activeModule) return;
    requestVersionRef.current += 1;
    feedRequestVersionRef.current += 1;
    setProductsLoading(true);
    setFeedLoading(true);
    setSearchParams({ module: code }, { replace: true });
  };

  const useful = async (item: HomeFeedItemDto) => {
    if (!item.report) return;
    if (!user) {
      message.info('登录后可以标记有用');
      navigate(buildLoginPath(`/mall?module=${activeModule}`), { state: LOGIN_RETURN_TO_SOURCE_STATE });
      return;
    }
    if (item.report.shopUserId === user.id) {
      message.warning('不能给自己的甄客验标记有用');
      return;
    }
    try {
      const result = await toggleReportUseful(item.contentId);
      setFeed((items) => items.map((current) => (
        current.contentType === 'REPORT' && current.contentId === item.contentId && current.report
          ? { ...current, report: { ...current.report, ...result } }
          : current
      )));
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '操作失败');
    }
  };

  if (legacyTarget) return <Navigate to={legacyTarget} replace />;

  return (
    <main className={`${styles.page} ${presentation.mallPage}`}>
      <nav className={presentation.modules} aria-label="营业模块">
        {BUSINESS_MODULES.map((module) => (
          <button
            key={module.code}
            type="button"
            className={presentation.moduleCard}
            aria-pressed={activeModule === module.code}
            onClick={() => openModule(module.code)}
          >
            <span className={presentation.moduleIcon}>{moduleIcons[module.code]}</span>
            <strong>{module.title}</strong>
          </button>
        ))}
      </nav>

      <header className={presentation.previewHeading}>
        <div><h1>{moduleTitle === '商城' ? '在售商品' : `${moduleTitle}精选`}</h1>{!productsLoading && <span>{productTotal} 件商品</span>}</div>
        <Link to={`/mall/products?module=${activeModule}`} aria-label={`查看更多${moduleTitle}商品`}>查看更多 <RightOutlined /></Link>
      </header>
      <section className={presentation.previewSection} aria-label={`${moduleTitle}商品预览`} aria-busy={productsLoading}>
        {productsLoading ? (
          <ZkState kind="loading" title="正在加载商城商品" />
        ) : productsError ? (
          <ZkState kind="error" title="商城暂时无法加载" description={productsError} onAction={() => void loadProducts()} />
        ) : products.length === 0 ? (
          <ZkState title="暂无在售商品" />
        ) : (
          <div className={presentation.productGrid}>
            {products.map((product) => (
              <StoreProductCard key={product.productId} product={product} />
            ))}
          </div>
        )}
      </section>

      <header className={presentation.previewHeading}>
        <div><h2>试用与甄客验</h2></div>
        <Link to={`/mall/content?module=${activeModule}`}>查看更多 <RightOutlined /></Link>
      </header>
      <section className={presentation.previewSection} aria-busy={feedLoading}>
        {feedLoading ? (
          <ZkState kind="loading" title="正在加载试用与甄客验" />
        ) : feedError ? (
          <ZkState kind="error" title="试用与甄客验暂时无法加载" description={feedError} onAction={() => void loadFeed()} />
        ) : feed.length === 0 ? (
          <ZkState title="暂无试用或甄客验" />
        ) : (
          <div className={styles.commerceFeedGrid}>
            {feed.map((item) => item.contentType === 'REPORT' ? (
              <HomeFeedReportCard
                key={`report-${item.contentId}`}
                item={item}
                onOpen={() => navigate(`/reports/${item.contentId}`)}
                onUseful={() => void useful(item)}
                usefulDisabled={item.report?.shopUserId === user?.id}
              />
            ) : (
              <article
                key={`trial-${item.contentId}`}
                className={styles.commerceTrialCard}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/products/${item.productId}?campaign=${item.contentId}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/products/${item.productId}?campaign=${item.contentId}`);
                  }
                }}
              >
                <img src={item.coverUrl} alt={item.title} loading="lazy" />
                <div>
                  <span>{item.trial?.trialType === 'OFFLINE' ? '线下试用' : '线上试用'}</span>
                  <h3>{item.title}</h3>
                  <p>{item.summary || item.merchantName}</p>
                  <footer>
                    <strong>{item.merchantName}</strong>
                    <em>{item.trial ? `剩余 ${Math.max(0, item.trial.targetCount - item.trial.approvedCount)} 份` : '查看详情'}</em>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
