import { SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import { Spin, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import {
  fetchMallProducts,
  fetchProductCategories,
  type MallProductDto,
  type ProductCategoryDto,
} from '@/services/shopContent';
import styles from '@/styles/commerce.less';

const MALL_PAGE_SIZE = 12;

export default function MallPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState<MallProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedPage, setLoadedPage] = useState(0);
  const [total, setTotal] = useState(0);
  const requestVersion = useRef(0);
  const productPaneRef = useRef<HTMLElement | null>(null);
  const loadMoreTrigger = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    fetchProductCategories()
      .then((rows) => {
        if (mounted) setCategories(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '商品分类加载失败');
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setProducts([]);
    setLoadedPage(0);
    setTotal(0);
    fetchMallProducts({
      categoryId: categoryId ?? undefined,
      keyword: keyword || undefined,
      pageNum: 1,
      pageSize: MALL_PAGE_SIZE,
    })
      .then((result) => {
        if (requestVersion.current !== version) return;
        setProducts(result.rows);
        setTotal(result.total);
        setLoadedPage(1);
      })
      .catch((error) => {
        if (requestVersion.current === version) {
          message.error(error instanceof Error ? error.message : '商城商品加载失败');
        }
      })
      .finally(() => {
        if (requestVersion.current === version) setLoading(false);
      });
  }, [categoryId, keyword]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current || loadedPage < 1 || products.length >= total) return;
    const version = requestVersion.current;
    const nextPage = loadedPage + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await fetchMallProducts({
        categoryId: categoryId ?? undefined,
        keyword: keyword || undefined,
        pageNum: nextPage,
        pageSize: MALL_PAGE_SIZE,
      });
      if (requestVersion.current !== version) return;
      setProducts((current) => {
        const existing = new Set(current.map((item) => item.productId));
        return [...current, ...result.rows.filter((item) => !existing.has(item.productId))];
      });
      setLoadedPage(nextPage);
    } catch (error) {
      if (requestVersion.current === version) {
        message.error(error instanceof Error ? error.message : '更多商品加载失败');
      }
    } finally {
      if (requestVersion.current === version) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [categoryId, keyword, loadedPage, loading, products.length, total]);

  useEffect(() => {
    const root = productPaneRef.current;
    const target = loadMoreTrigger.current;
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

  const activeCategoryName = categoryId == null
    ? '全部商品'
    : categories.find((item) => item.categoryId === categoryId)?.categoryName ?? '当前分类';

  return (
    <main className={styles.mallPage}>
      <form
        className={styles.mallSearch}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const value = searchValue.trim();
          setSearchValue(value);
          setKeyword(value);
        }}
      >
        <div className={styles.mallSearchControl}>
          <SearchOutlined className={styles.mallSearchIcon} aria-hidden="true" />
          <input
            type="search"
            maxLength={50}
            value={searchValue}
            aria-label="商城商品搜索"
            placeholder="搜索商品、品牌、商家或商品编号"
            onChange={(event) => {
              const value = event.target.value;
              setSearchValue(value);
              if (!value && keyword) setKeyword('');
            }}
          />
          {searchValue && (
            <button
              type="button"
              className={styles.mallSearchClear}
              aria-label="清空搜索"
              onClick={() => {
                setSearchValue('');
                setKeyword('');
              }}
            >
              ×
            </button>
          )}
          <button type="submit" className={styles.mallSearchSubmit}>搜索</button>
        </div>
      </form>

      <div className={styles.mallLayout}>
        <aside className={styles.mallCategoryRail} aria-label="商城分类">
        <button
          type="button"
          className={categoryId == null ? styles.mallCategoryActive : ''}
          aria-pressed={categoryId == null}
          onClick={() => setCategoryId(null)}
        >
          全部商品
        </button>
        {categories.map((category) => (
          <button
            key={category.categoryId}
            type="button"
            className={categoryId === category.categoryId ? styles.mallCategoryActive : ''}
            aria-pressed={categoryId === category.categoryId}
            onClick={() => setCategoryId(category.categoryId)}
          >
            {category.categoryName}
          </button>
        ))}
      </aside>

      <section ref={productPaneRef} className={styles.mallProductPane} aria-live="polite">
        <div className={styles.mallProductHeading}>
          <h2>{keyword ? `“${keyword}”的搜索结果` : activeCategoryName}</h2>
          {!loading && <em>共 {total} 件</em>}
        </div>

        {loading && <div className={styles.mallLoading}><Spin /></div>}

        {!loading && products.length === 0 && (
          <div className={styles.mallEmpty}>
            <strong>{keyword ? '没有找到相关商品' : '当前分类暂无商品'}</strong>
            <p>{keyword ? '可以尝试更换商品名、品牌、商家或分类关键词。' : '商家上架商品后会显示在这里。'}</p>
          </div>
        )}

        <div className={styles.mallProductList}>
          {products.map((product) => {
            const soldOut = Number(product.stock) <= 0;
            return (
              <button
                key={product.productId}
                type="button"
                className={styles.mallProductCard}
                onClick={() => navigate(`/products/${product.productId}`)}
              >
                <span className={styles.mallProductImage}>
                  <img loading="lazy" decoding="async" src={product.coverUrl} alt={product.productName} />
                  {soldOut && <i>已售罄</i>}
                </span>
                <span className={styles.mallProductInfo}>
                  <span className={styles.mallProductTitleRow}>
                    <strong>
                      <span className={styles.mallProductBrand}>{product.brandName}</span>
                      {product.productName}
                    </strong>
                  </span>
                  {product.subtitle && <small>{product.subtitle}</small>}
                  <span className={styles.mallProductMeta}>
                    <b>¥{Number(product.price).toFixed(2)}</b>
                    <em>已售 {Number(product.salesCount) || 0}</em>
                  </span>
                  <span className={styles.mallProductFooter}>
                    <span className={styles.mallMerchant}>{product.merchantName}</span>
                    {product.certificationStatus === 'PASSED' && (
                      <span className={styles.mallCertificationBadge}>
                        <SafetyCertificateOutlined />
                        <span>商家承诺正品</span>
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {!loading && products.length < total && (
          <div ref={loadMoreTrigger} className={styles.mallLoadMore} role="status">
            {loadingMore ? (
              <><Spin size="small" /><span>正在加载更多</span></>
            ) : (
              <span>继续下滑，将自动加载更多</span>
            )}
          </div>
        )}
        </section>
      </div>
    </main>
  );
}
