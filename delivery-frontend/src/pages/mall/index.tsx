import {
  CheckCircleOutlined,
  FieldTimeOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { HomeFeedReportCard } from '@/components/HomeFeedReportCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  fetchHomeFeed,
  fetchMallProducts,
  fetchProductCategories,
  toggleReportUseful,
  type HomeFeedItemDto,
  type MallProductDto,
  type ProductCategoryDto,
} from '@/services/shopContent';
import { buildLoginPath } from '@/utils/safeRedirect';
import styles from '@/styles/zhenke.less';

const PAGE_SIZE = 16;
const businessModules = [
  { code: 'MALL', title: '商城', caption: '精选好物 · 配送与核销', mark: '购' },
  { code: 'ZHENKE_HOTEL', title: '酒店', caption: '住宿套餐 · 到店核销', mark: '住' },
  { code: 'ZHENKE_SCENIC', title: '景区', caption: '门票线路 · 现场核销', mark: '游' },
  { code: 'ZHENKE_RESTAURANT', title: '饭店', caption: '餐券套餐 · 到店核销', mark: '食' },
] as const;
type BusinessModuleCode = (typeof businessModules)[number]['code'];
const localLifeCodes = new Set<BusinessModuleCode>([
  'ZHENKE_HOTEL',
  'ZHENKE_SCENIC',
  'ZHENKE_RESTAURANT',
]);

function normalizeBusinessModule(value: string | null): BusinessModuleCode {
  return businessModules.some((item) => item.code === value) ? value as BusinessModuleCode : 'MALL';
}

export default function MallPage() {
  const navigate = useNavigate();
  const { user } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRouteCode = searchParams.get('module') ?? searchParams.get('scene');
  const activeModule = normalizeBusinessModule(requestedRouteCode);
  const requestedCategory = searchParams.get('category')
    ?? (activeModule === 'MALL' && requestedRouteCode !== 'MALL' ? requestedRouteCode : null);
  const requestedKeyword = searchParams.get('keyword') ?? '';
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState(requestedKeyword);
  const [keyword, setKeyword] = useState(requestedKeyword);
  const [products, setProducts] = useState<MallProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [commerceFeed, setCommerceFeed] = useState<HomeFeedItemDto[]>([]);
  const [commerceFeedTotal, setCommerceFeedTotal] = useState(0);
  const [commerceFeedPage, setCommerceFeedPage] = useState(1);
  const [commerceFeedLoading, setCommerceFeedLoading] = useState(true);
  const [commerceFeedLoadingMore, setCommerceFeedLoadingMore] = useState(false);
  const [commerceFeedError, setCommerceFeedError] = useState('');

  useEffect(() => {
    setCategoryError('');
    fetchProductCategories().then((rows) => {
      setCategories(rows);
    }).catch((reason) => {
      setCategories([]);
      setCategoryError(reason instanceof Error ? reason.message : '商品分类加载失败');
    }).finally(() => {
      setCategoriesLoading(false);
    });
  }, []);

  useEffect(() => {
    setKeywordInput(requestedKeyword);
    setKeyword(requestedKeyword);
  }, [requestedKeyword]);

  const legacyCategories = useMemo(
    () => categories.filter((item) => !localLifeCodes.has(item.categoryCode as BusinessModuleCode)),
    [categories],
  );
  const activeCategory = useMemo(() => {
    if (activeModule === 'MALL') {
      return legacyCategories.find((item) => item.categoryCode === requestedCategory);
    }
    return categories.find((item) => item.categoryCode === activeModule);
  }, [activeModule, categories, legacyCategories, requestedCategory]);
  const activeCategoryId = activeCategory?.categoryId;

  const loadProducts = useCallback(async () => {
    if (categoriesLoading) return;
    if (activeModule !== 'MALL' && !activeCategoryId) {
      setProducts([]);
      setTotal(0);
      setPage(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await fetchMallProducts({
        categoryId: activeCategoryId,
        businessModule: activeModule === 'MALL' ? 'MALL' : undefined,
        keyword: keyword || undefined,
        pageNum: 1,
        pageSize: PAGE_SIZE,
      });
      setProducts(result.rows);
      setTotal(result.total);
      setPage(1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '商城商品加载失败');
    } finally {
      setLoading(false);
    }
  }, [activeCategoryId, activeModule, categoriesLoading, keyword]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const loadCommerceFeed = useCallback(async () => {
    if (categoriesLoading) return;
    if (activeModule !== 'MALL' && !activeCategoryId) {
      setCommerceFeed([]);
      setCommerceFeedTotal(0);
      setCommerceFeedPage(1);
      setCommerceFeedLoading(false);
      return;
    }
    setCommerceFeedLoading(true);
    setCommerceFeedError('');
    try {
      const result = await fetchHomeFeed({
        categoryCode: activeCategory?.categoryCode,
        businessModule: activeModule === 'MALL' ? 'MALL' : undefined,
        keyword: keyword || undefined,
        contentType: 'ALL',
        trialType: 'ALL',
        pageNum: 1,
        pageSize: 8,
      });
      setCommerceFeed(result.rows);
      setCommerceFeedTotal(result.total);
      setCommerceFeedPage(1);
    } catch (reason) {
      setCommerceFeedError(reason instanceof Error ? reason.message : '商城试用与甄客验加载失败');
    } finally {
      setCommerceFeedLoading(false);
    }
  }, [activeCategory?.categoryCode, activeCategoryId, activeModule, categoriesLoading, keyword]);

  useEffect(() => {
    void loadCommerceFeed();
  }, [loadCommerceFeed]);

  const selectModule = (code: BusinessModuleCode) => {
    const category = categories.find((item) => item.categoryCode === code);
    if (code !== 'MALL' && !category) {
      message.warning('该本地生活分类尚未完成数据库初始化，请管理员先执行增量 SQL 并启用分类');
      return;
    }
    const next = new URLSearchParams({ module: code });
    if (keyword) next.set('keyword', keyword);
    setSearchParams(next);
    document.getElementById('mall-products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitSearch = () => {
    const normalized = keywordInput.trim();
    setKeywordInput(normalized);
    setKeyword(normalized);
    const next = new URLSearchParams();
    if (normalized) next.set('keyword', normalized);
    next.set('module', activeModule);
    if (activeModule === 'MALL' && activeCategory?.categoryCode) {
      next.set('category', activeCategory.categoryCode);
    }
    setSearchParams(next);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchMallProducts({
        categoryId: activeCategoryId,
        businessModule: activeModule === 'MALL' ? 'MALL' : undefined,
        keyword: keyword || undefined,
        pageNum: nextPage,
        pageSize: PAGE_SIZE,
      });
      setProducts((current) => {
        const ids = new Set(current.map((item) => item.productId));
        return [...current, ...result.rows.filter((item) => !ids.has(item.productId))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '更多商城商品加载失败');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreCommerceFeed = async () => {
    setCommerceFeedLoadingMore(true);
    try {
      const nextPage = commerceFeedPage + 1;
      const result = await fetchHomeFeed({
        categoryCode: activeCategory?.categoryCode,
        businessModule: activeModule === 'MALL' ? 'MALL' : undefined,
        keyword: keyword || undefined,
        contentType: 'ALL',
        trialType: 'ALL',
        pageNum: nextPage,
        pageSize: 8,
      });
      setCommerceFeed((current) => {
        const keys = new Set(current.map((item) => `${item.contentType}-${item.contentId}`));
        return [...current, ...result.rows.filter((item) => !keys.has(`${item.contentType}-${item.contentId}`))];
      });
      setCommerceFeedTotal(result.total);
      setCommerceFeedPage(nextPage);
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '更多商城内容加载失败');
    } finally {
      setCommerceFeedLoadingMore(false);
    }
  };

  const toggleUseful = async (item: HomeFeedItemDto) => {
    if (!item.report) return;
    if (!user) {
      message.info('登录后可以标记有用');
      navigate(buildLoginPath(`${window.location.pathname}${window.location.search}`));
      return;
    }
    if (item.report.shopUserId === user.id) {
      message.warning('不能给自己的甄客验标记有用');
      return;
    }
    try {
      const result = await toggleReportUseful(item.contentId);
      setCommerceFeed((items) => items.map((current) => (
        current.contentType === 'REPORT' && current.contentId === item.contentId && current.report
          ? { ...current, report: { ...current.report, ...result } }
          : current
      )));
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '操作失败');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.mallHero}>
        <article className={styles.mallHeroMain}>
          <span className={styles.locationLabel}>甄客行商城</span>
          <h1>把看见的城市生活，变成一次安心消费。</h1>
          <p>精选商城好物、酒店住宿、景区门票和饭店套餐，按商品说明配送或到店使用。</p>
        </article>
        <aside className={`${styles.surface} ${styles.mallPromise}`}>
          <div className={styles.promiseItem}>
            <span><SafetyCertificateOutlined /></span>
            <div><strong>平台入驻商家</strong><small>公开信息清楚可查</small></div>
          </div>
          <div className={styles.promiseItem}>
            <span><QrcodeOutlined /></span>
            <div><strong>配送与到店使用</strong><small>购买前查看商品使用方式</small></div>
          </div>
          <div className={styles.promiseItem}>
            <span><FieldTimeOutlined /></span>
            <div><strong>规则购买前可见</strong><small>有效期、预约与退款说明</small></div>
          </div>
        </aside>
      </section>

      <ZkSectionTitle title="四大营业模块" description="选择你今天想逛的分类。" />
      <div className={styles.businessModuleGrid}>
        {businessModules.map((module) => (
          <button
            key={module.code}
            type="button"
            className={`${styles.businessModuleCard} ${activeModule === module.code ? styles.businessModuleCardActive : ''}`}
            aria-pressed={activeModule === module.code}
            onClick={() => selectModule(module.code)}
          >
            <span>{module.mark}</span>
            <strong>{module.title}</strong>
            <p>{module.caption}</p>
          </button>
        ))}
      </div>

      <form
        className={styles.mallSearch}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <SearchOutlined />
        <input
          type="search"
          maxLength={50}
          value={keywordInput}
          aria-label="搜索商城商品"
          placeholder="搜索套餐、商品、品牌或商家"
          onChange={(event) => setKeywordInput(event.target.value)}
        />
        <Button type="primary" htmlType="submit">搜索</Button>
      </form>

      {activeModule === 'MALL' && (
        <nav className={styles.categoryRail} aria-label="商城商品分类">
          <button
            type="button"
            className={`${styles.categoryChip} ${activeCategoryId == null ? styles.categoryChipActive : ''}`}
            onClick={() => {
              const next = new URLSearchParams({ module: 'MALL' });
              if (keyword) next.set('keyword', keyword);
              setSearchParams(next);
            }}
          >商城全部</button>
          {legacyCategories.map((category) => (
            <button
              key={category.categoryId}
              type="button"
              className={`${styles.categoryChip} ${activeCategoryId === category.categoryId ? styles.categoryChipActive : ''}`}
              onClick={() => {
                const next = new URLSearchParams({ module: 'MALL', category: category.categoryCode });
                if (keyword) next.set('keyword', keyword);
                setSearchParams(next);
              }}
            >{category.categoryName}</button>
          ))}
        </nav>
      )}
      {categoryError && (
        <div className={styles.contextNotice} role="alert">
          <span>商品分类暂时无法加载：{categoryError}。当前仍可浏览全部商品。</span>
          <Button type="link" onClick={() => window.location.reload()}>重新加载分类</Button>
        </div>
      )}

      <ZkSectionTitle
        title={keyword
          ? `“${keyword}”的搜索结果`
          : activeCategory?.categoryName ?? businessModules.find((item) => item.code === activeModule)?.title ?? '正在售卖'}
        description={!loading ? `共 ${total} 件商品` : '正在查询商品。'}
      />

      <section id="mall-products">
        {loading ? (
          <ZkState kind="loading" title="正在加载商城商品" />
        ) : error ? (
          <ZkState kind="error" title="商城暂时无法加载" description={error} onAction={() => void loadProducts()} />
        ) : products.length === 0 ? (
          <ZkState
            title={keyword ? '没有找到相关商品' : '当前模块还没有在售商品'}
            description={keyword
              ? '请尝试更换商品、品牌或商家关键词。'
              : activeModule === 'MALL'
                ? '暂时没有找到在售商品，稍后再来看看。'
                : '当前分类暂时没有可购买的套餐，稍后再来看看。'}
            actionText={keyword ? '清空搜索' : undefined}
            onAction={keyword ? () => {
              const next = new URLSearchParams();
              next.set('module', activeModule);
              if (activeModule === 'MALL' && activeCategory?.categoryCode) {
                next.set('category', activeCategory.categoryCode);
              }
              setSearchParams(next);
            } : undefined}
          />
        ) : (
          <>
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
                    {product.stock <= 0 && <b>已售罄</b>}
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
            {products.length < total && (
              <div className={styles.loadMore}>
                <Button size="large" loading={loadingMore} onClick={() => void loadMore()}>加载更多商品</Button>
              </div>
            )}
          </>
        )}
      </section>

      <ZkSectionTitle
        title={`${activeCategory?.categoryName ?? businessModules.find((item) => item.code === activeModule)?.title ?? '商城'}试用与甄客验`}
        description="发现正在招募的试用和消费者分享的甄客验。"
      />
      <section>
        {commerceFeedLoading ? (
          <ZkState kind="loading" title="正在加载试用与甄客验" />
        ) : commerceFeedError ? (
          <ZkState kind="error" title="试用与甄客验暂时无法加载" description={commerceFeedError} onAction={() => void loadCommerceFeed()} />
        ) : commerceFeed.length === 0 ? (
          <ZkState
            title="当前分类暂无试用或推荐甄客验"
            description="有新的试用活动或甄客验时，会展示在这里。"
          />
        ) : (
          <>
            <div className={styles.commerceFeedGrid}>
              {commerceFeed.map((item) => item.contentType === 'REPORT' ? (
                <HomeFeedReportCard
                  key={`report-${item.contentId}`}
                  item={item}
                  onOpen={() => navigate(`/reports/${item.contentId}`)}
                  onUseful={() => void toggleUseful(item)}
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
            {commerceFeed.length < commerceFeedTotal && (
              <div className={styles.loadMore}>
                <Button size="large" loading={commerceFeedLoadingMore} onClick={() => void loadMoreCommerceFeed()}>
                  加载更多试用与甄客验
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      <div className={styles.contextNotice}>
        <CheckCircleOutlined /> 商品价格、库存、优惠、订单状态和核销资格均以后端实时结果为准。
      </div>
    </main>
  );
}
