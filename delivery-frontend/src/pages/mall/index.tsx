import { RightOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { HomeFeedReportCard } from '@/components/HomeFeedReportCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  fetchHomeFeed,
  fetchMallProducts,
  toggleReportUseful,
  type HomeFeedItemDto,
  type MallProductDto,
} from '@/services/shopContent';
import { buildLoginPath, LOGIN_RETURN_TO_SOURCE_STATE } from '@/utils/safeRedirect';
import styles from '@/styles/zhenke.less';
import { BUSINESS_MODULES, type BusinessModuleCode } from './modules';

const PREVIEW_SIZE = 4;

export default function MallPage() {
  const navigate = useNavigate();
  const { user } = useShop();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<MallProductDto[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [feed, setFeed] = useState<HomeFeedItemDto[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const requestVersionRef = useRef(0);

  const legacyView = searchParams.get('view');
  const legacyModule = searchParams.get('module') ?? searchParams.get('scene');
  const legacyCategory = searchParams.get('category');
  const legacyKeyword = searchParams.get('keyword');
  const legacyContent = searchParams.get('content');
  const legacyTarget = (() => {
    if (legacyView === 'feed') {
      const next = new URLSearchParams();
      if (legacyContent) next.set('content', legacyContent);
      if (legacyKeyword) next.set('keyword', legacyKeyword);
      const query = next.toString();
      return `/mall/content${query ? `?${query}` : ''}`;
    }
    if (legacyView === 'list' || legacyModule || legacyCategory || legacyKeyword) {
      const next = new URLSearchParams();
      if (legacyModule) next.set('module', legacyModule);
      if (legacyCategory) next.set('category', legacyCategory);
      if (legacyKeyword) next.set('keyword', legacyKeyword);
      const query = next.toString();
      return `/mall/products${query ? `?${query}` : ''}`;
    }
    return '';
  })();

  const loadProducts = async () => {
    const requestVersion = ++requestVersionRef.current;
    setProductsLoading(true);
    setProductsError('');
    try {
      const result = await fetchMallProducts({ pageNum: 1, pageSize: PREVIEW_SIZE });
      if (requestVersion !== requestVersionRef.current) return;
      setProducts(result.rows.slice(0, PREVIEW_SIZE));
      setProductTotal(result.total);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setProductsError(reason instanceof Error ? reason.message : '商城商品加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setProductsLoading(false);
    }
  };

  const loadFeed = async () => {
    setFeedLoading(true);
    setFeedError('');
    try {
      const result = await fetchHomeFeed({
        businessModule: 'MALL',
        contentType: 'ALL',
        trialType: 'ALL',
        pageNum: 1,
        pageSize: PREVIEW_SIZE,
      });
      setFeed(result.rows.slice(0, PREVIEW_SIZE));
    } catch (reason) {
      setFeedError(reason instanceof Error ? reason.message : '试用与甄客验加载失败');
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (legacyTarget) return;
    void loadProducts();
    void loadFeed();
    return () => {
      requestVersionRef.current += 1;
    };
  }, [legacyTarget]);

  const openModule = (code: BusinessModuleCode) => {
    navigate(`/mall/products?module=${encodeURIComponent(code)}`);
  };

  const useful = async (item: HomeFeedItemDto) => {
    if (!item.report) return;
    if (!user) {
      message.info('登录后可以标记有用');
      navigate(buildLoginPath('/mall'), { state: LOGIN_RETURN_TO_SOURCE_STATE });
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
    <main className={styles.page}>
      <aside className={`${styles.surface} ${styles.mallPromise} ${styles.mallPromiseStandalone}`}>
        <header className={styles.mallPromiseHeader}>
          <span>消费服务</span>
          <strong>下单前看清，购买后好履约</strong>
        </header>
        <div className={styles.promiseItem}>
          <b>01</b>
          <div><strong>商家信息可查</strong><small>公开展示入驻主体和经营信息</small></div>
        </div>
        <div className={styles.promiseItem}>
          <b>02</b>
          <div><strong>履约方式明确</strong><small>配送、预约或到店核销提前说明</small></div>
        </div>
        <div className={styles.promiseItem}>
          <b>03</b>
          <div><strong>使用规则清楚</strong><small>有效期、退款和过期规则集中查看</small></div>
        </div>
      </aside>

      <ZkSectionTitle title="今天想逛什么" />
      <div className={styles.businessModuleGrid}>
        {BUSINESS_MODULES.map((module) => (
          <button
            key={module.code}
            type="button"
            className={styles.businessModuleCard}
            onClick={() => openModule(module.code)}
          >
            <small className={styles.businessModuleKicker}>{module.kicker}</small>
            <strong>{module.title}</strong>
            <p>{module.caption}</p>
            <span className={styles.businessModuleLink}>查看更多 <RightOutlined /></span>
          </button>
        ))}
      </div>

      <ZkSectionTitle
        title="商城好物"
        description={productsLoading ? '正在查询商品' : `全部商品 · 共 ${productTotal} 件`}
        action={(
          <button type="button" className={styles.textButton} onClick={() => openModule('MALL')}>
            查看更多 <RightOutlined />
          </button>
        )}
      />
      <section className={styles.mallHomeProducts}>
        {productsLoading ? (
          <ZkState kind="loading" title="正在加载商城商品" />
        ) : productsError ? (
          <ZkState kind="error" title="商城暂时无法加载" description={productsError} onAction={() => void loadProducts()} />
        ) : products.length === 0 ? (
          <ZkState title="商城还没有在售商品" description="有新商品上架后，会优先展示在这里。" />
        ) : (
          <div className={styles.productGrid}>
            {products.map((product) => (
              <article
                key={product.productId}
                className={styles.productCard}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/products/${product.productId}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/products/${product.productId}`);
                  }
                }}
              >
                <span className={styles.productCover}>
                  <img src={product.coverUrl} alt={product.productName} loading="lazy" />
                  <em>{product.categoryName}</em>
                  {product.stockUnlimited !== '1' && product.stock <= 0 && <b>已售罄</b>}
                </span>
                <span className={styles.productCardBody}>
                  <small>{product.merchantName}</small>
                  <h3>{product.productName}</h3>
                  <p>{product.subtitle || product.brandName}</p>
                  <span className={styles.productCardFooter}>
                    <strong className={styles.productPrice}>¥{Number(product.price).toFixed(2)}</strong>
                    <span className={styles.productSales}>已售 {product.salesCount}</span>
                  </span>
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <ZkSectionTitle
        title="商城试用与甄客验"
        description="发现正在招募的试用和消费者分享的甄客验。"
        action={(
          <button type="button" className={styles.textButton} onClick={() => navigate('/mall/content')}>
            查看更多 <RightOutlined />
          </button>
        )}
      />
      <section>
        {feedLoading ? (
          <ZkState kind="loading" title="正在加载试用与甄客验" />
        ) : feedError ? (
          <ZkState kind="error" title="试用与甄客验暂时无法加载" description={feedError} onAction={() => void loadFeed()} />
        ) : feed.length === 0 ? (
          <ZkState title="商城暂无试用或推荐甄客验" description="有新的试用活动或甄客验时，会展示在这里。" />
        ) : (
          <div className={styles.commerceFeedGrid}>
            {feed.map((item) => item.contentType === 'REPORT' ? (
              <HomeFeedReportCard
                key={`report-${item.contentId}`}
                item={item}
                onOpen={() => navigate(`/reports/${item.contentId}`)}
                onUseful={() => void useful(item)}
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
