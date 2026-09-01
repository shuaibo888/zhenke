import {
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'umi';
import { ZkState } from '@/components/ZkPage';
import {
  fetchMallProducts,
  fetchProductCategories,
  type MallProductDto,
  type ProductCategoryDto,
} from '@/services/shopContent';
import styles from '@/styles/zhenke.less';
import {
  BUSINESS_MODULES,
  LOCAL_LIFE_CODES,
  normalizeBusinessModule,
  type BusinessModuleCode,
} from './modules';

const PAGE_SIZE = 12;

export default function MallProductsPage() {
  const navigate = useNavigate();
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
  const requestVersionRef = useRef(0);
  const productPaneRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    fetchProductCategories().then((rows) => {
      setCategories(rows);
    }).catch((reason) => {
      setCategories([]);
      message.error(reason instanceof Error ? reason.message : '商品分类加载失败');
    }).finally(() => {
      setCategoriesLoading(false);
    });
  }, []);

  useEffect(() => {
    setKeywordInput(requestedKeyword);
    setKeyword(requestedKeyword);
  }, [requestedKeyword]);

  const legacyCategories = useMemo(
    () => categories.filter((item) => !LOCAL_LIFE_CODES.has(item.categoryCode as BusinessModuleCode)),
    [categories],
  );
  const activeCategory = useMemo(() => {
    if (activeModule === 'MALL') {
      return legacyCategories.find((item) => item.categoryCode === requestedCategory);
    }
    return categories.find((item) => item.categoryCode === activeModule);
  }, [activeModule, categories, legacyCategories, requestedCategory]);
  const activeCategoryId = activeCategory?.categoryId;
  const activeModuleMeta = BUSINESS_MODULES.find((item) => item.code === activeModule) ?? BUSINESS_MODULES[0];
  const sidebarCategories = activeModule === 'MALL'
    ? legacyCategories
    : activeCategory ? [activeCategory] : [];
  const localLifeModuleUnavailable = activeModule !== 'MALL' && !activeCategoryId;
  const productHeading = keyword
    ? `“${keyword}”的搜索结果`
    : activeCategory?.categoryName ?? (activeModule === 'MALL' ? '全部商品' : activeModuleMeta.title);

  const loadProducts = useCallback(async () => {
    if (categoriesLoading) return;
    const requestVersion = ++requestVersionRef.current;
    if (activeModule !== 'MALL' && !activeCategoryId) {
      setProducts([]);
      setTotal(0);
      setPage(1);
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setError('');
      if (productPaneRef.current) productPaneRef.current.scrollTop = 0;
      return;
    }
    setLoading(true);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setError('');
    setProducts([]);
    setTotal(0);
    setPage(1);
    if (productPaneRef.current) productPaneRef.current.scrollTop = 0;
    try {
      const result = await fetchMallProducts({
        categoryId: activeCategoryId,
        businessModule: activeModule === 'MALL' ? 'MALL' : undefined,
        keyword: keyword || undefined,
        pageNum: 1,
        pageSize: PAGE_SIZE,
      });
      if (requestVersion !== requestVersionRef.current) return;
      setProducts(result.rows);
      setTotal(result.total);
      setPage(1);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(reason instanceof Error ? reason.message : '商城商品加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [activeCategoryId, activeModule, categoriesLoading, keyword]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
  }, []);

  const selectCategory = (category?: ProductCategoryDto) => {
    const next = new URLSearchParams({ module: activeModule });
    if (keyword) next.set('keyword', keyword);
    if (activeModule === 'MALL' && category) next.set('category', category.categoryCode);
    setSearchParams(next);
  };

  const submitSearch = () => {
    const normalized = keywordInput.trim();
    setKeywordInput(normalized);
    setKeyword(normalized);
    const next = new URLSearchParams({ module: activeModule });
    if (normalized) next.set('keyword', normalized);
    if (activeModule === 'MALL' && activeCategory?.categoryCode) {
      next.set('category', activeCategory.categoryCode);
    }
    setSearchParams(next);
  };

  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current || products.length >= total) return;
    const requestVersion = requestVersionRef.current;
    loadingMoreRef.current = true;
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
      if (requestVersion !== requestVersionRef.current) return;
      setProducts((current) => {
        const ids = new Set(current.map((item) => item.productId));
        return [...current, ...result.rows.filter((item) => !ids.has(item.productId))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      message.error(reason instanceof Error ? reason.message : '更多商城商品加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [activeCategoryId, activeModule, keyword, loading, page, products.length, total]);

  useEffect(() => {
    const root = productPaneRef.current;
    const target = loadMoreTriggerRef.current;
    if (!root || !target || loading || products.length >= total
      || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root, rootMargin: '240px 0px', threshold: 0.01 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, loading, products.length, total]);

  return (
    <main className={`${styles.page} ${styles.mallProductsPage}`}>
      <div className={styles.mallListToolbar}>
        <button type="button" className={styles.mallListBack} aria-label="返回商城" onClick={() => navigate('/mall')}>
          <ArrowLeftOutlined />
        </button>
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
            aria-label={`搜索${activeModuleMeta.title}商品`}
            placeholder="搜索商品、套餐或商家"
            onChange={(event) => setKeywordInput(event.target.value)}
          />
          <Button type="primary" htmlType="submit">搜索</Button>
        </form>
      </div>

      <section className={styles.mallCatalog}>
        <aside className={styles.mallCategorySidebar} aria-label={`${activeModuleMeta.title}商品分类`}>
          {activeModule === 'MALL' && (
            <button
              type="button"
              aria-current={activeCategoryId == null ? 'page' : undefined}
              className={activeCategoryId == null ? styles.mallCategoryActive : ''}
              onClick={() => selectCategory()}
            >全部商品</button>
          )}
          {sidebarCategories.map((category) => (
            <button
              key={category.categoryId}
              type="button"
              aria-current={activeCategoryId === category.categoryId ? 'page' : undefined}
              className={activeCategoryId === category.categoryId ? styles.mallCategoryActive : ''}
              onClick={() => selectCategory(category)}
            >{category.categoryName}</button>
          ))}
          {activeModule !== 'MALL' && sidebarCategories.length === 0 && (
            <button type="button" className={styles.mallCategoryActive} disabled>
              {activeModuleMeta.title}
            </button>
          )}
          {activeModule === 'MALL' && categoriesLoading && (
            <span className={styles.mallCategoryLoading}>分类加载中…</span>
          )}
        </aside>

        <div ref={productPaneRef} className={styles.mallProductPane} aria-live="polite">
          <header className={styles.mallProductHeading}>
            <div>
              <small>{activeModuleMeta.kicker}</small>
              <h2>{productHeading}</h2>
            </div>
            <span>{loading ? '正在查询' : `共 ${total} 件`}</span>
          </header>

          {loading ? (
            <ZkState kind="loading" title="正在加载商城商品" />
          ) : error ? (
            <ZkState kind="error" title="商城暂时无法加载" description={error} onAction={() => void loadProducts()} />
          ) : localLifeModuleUnavailable ? (
            <ZkState
              title={`${activeModuleMeta.title}服务正在准备`}
              description="平台正在整理可购买的套餐与服务，上线后会在这里展示。"
            />
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
                const next = new URLSearchParams({ module: activeModule });
                if (activeModule === 'MALL' && activeCategory?.categoryCode) {
                  next.set('category', activeCategory.categoryCode);
                }
                setSearchParams(next);
              } : undefined}
            />
          ) : (
            <>
              <div className={styles.mallProductList}>
                {products.map((product) => (
                  <button
                    key={product.productId}
                    type="button"
                    className={styles.mallProductCard}
                    onClick={() => navigate(`/products/${product.productId}`)}
                  >
                    <span className={styles.mallProductImage}>
                      <img src={product.coverUrl} alt={product.productName} loading="lazy" />
                      <em>{product.categoryName}</em>
                      {product.stockUnlimited !== '1' && product.stock <= 0 && <b>已售罄</b>}
                    </span>
                    <span className={styles.mallProductInfo}>
                      <span className={styles.mallProductTitleRow}>
                        {product.brandName && <small>{product.brandName}</small>}
                        <strong>{product.productName}</strong>
                      </span>
                      <span className={styles.mallProductSummary}>{product.subtitle || '商品详情与履约规则请进入详情页查看'}</span>
                      <span className={styles.mallProductMeta}>
                        <b>¥{Number(product.price).toFixed(2)}</b>
                        <em>已售 {product.salesCount}</em>
                      </span>
                      <span className={styles.mallProductFooter}>
                        <span>{product.merchantName}</span>
                        {product.certificationStatus === 'PASSED' && (
                          <small><SafetyCertificateOutlined /> 商家承诺正品</small>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {products.length < total && (
                <div ref={loadMoreTriggerRef} className={styles.loadMore} role="status">
                  <Button size="large" loading={loadingMore} onClick={() => void loadMore()}>加载更多商品</Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
