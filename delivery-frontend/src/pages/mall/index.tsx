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
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  fetchMallProducts,
  fetchProductCategories,
  type MallProductDto,
  type ProductCategoryDto,
} from '@/services/shopContent';
import styles from '@/styles/zhenke.less';

const PAGE_SIZE = 16;
const localLifeScenes = [
  { code: 'ZHENKE_HOTEL', title: '甄客酒店', caption: '住宿套餐 · 到店核销', mark: '住' },
  { code: 'ZHENKE_RESTAURANT', title: '甄客饭店', caption: '餐券套餐 · 到店核销', mark: '食' },
  { code: 'ZHENKE_SCENIC', title: '甄客景区', caption: '门票线路 · 现场核销', mark: '游' },
] as const;

export default function MallPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScene = searchParams.get('scene');
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number>();
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') ?? '');
  const [keyword, setKeyword] = useState(searchParams.get('keyword') ?? '');
  const [products, setProducts] = useState<MallProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    setCategoryError('');
    fetchProductCategories().then((rows) => {
      setCategories(rows);
      if (requestedScene) {
        const selected = rows.find((item) => item.categoryCode === requestedScene);
        if (selected) setActiveCategoryId(selected.categoryId);
      }
    }).catch((reason) => {
      setCategories([]);
      setCategoryError(reason instanceof Error ? reason.message : '商品分类加载失败');
    });
  }, [requestedScene]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMallProducts({
        categoryId: activeCategoryId,
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
  }, [activeCategoryId, keyword]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const activeCategory = useMemo(
    () => categories.find((item) => item.categoryId === activeCategoryId),
    [activeCategoryId, categories],
  );

  const selectScene = (code: string) => {
    const category = categories.find((item) => item.categoryCode === code);
    if (!category) {
      message.warning('该本地生活分类尚未完成数据库初始化，请管理员先执行增量 SQL 并启用分类');
      return;
    }
    setActiveCategoryId(category.categoryId);
    setSearchParams({ scene: code });
    document.getElementById('mall-products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitSearch = () => {
    const normalized = keywordInput.trim();
    setKeywordInput(normalized);
    setKeyword(normalized);
    const next = new URLSearchParams();
    if (normalized) next.set('keyword', normalized);
    if (activeCategory?.categoryCode) next.set('scene', activeCategory.categoryCode);
    setSearchParams(next);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchMallProducts({
        categoryId: activeCategoryId,
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

  return (
    <main className={styles.page}>
      <section className={styles.mallHero}>
        <article className={styles.mallHeroMain}>
          <span className={styles.locationLabel}>甄客行交易模块</span>
          <h1>把看见的城市生活，变成一次安心消费。</h1>
          <p>
            酒店、饭店和景区使用现有统一商品、订单、支付与线下核销链路；
            其他动态分类继续保留原有配送能力。
          </p>
        </article>
        <aside className={`${styles.surface} ${styles.mallPromise}`}>
          <div className={styles.promiseItem}>
            <span><SafetyCertificateOutlined /></span>
            <div><strong>真实入驻商家</strong><small>商品归属由服务端确认</small></div>
          </div>
          <div className={styles.promiseItem}>
            <span><QrcodeOutlined /></span>
            <div><strong>统一核销码</strong><small>支付后在订单详情查看</small></div>
          </div>
          <div className={styles.promiseItem}>
            <span><FieldTimeOutlined /></span>
            <div><strong>规则购买前可见</strong><small>有效期、预约与退款说明</small></div>
          </div>
        </aside>
      </section>

      <ZkSectionTitle title="三大本地生活场景" description="通过稳定分类代码识别，不依赖数据库自增 ID 或中文名称。" />
      <div className={styles.sceneGrid}>
        {localLifeScenes.map((scene) => (
          <button key={scene.code} type="button" className={styles.sceneCard} onClick={() => selectScene(scene.code)}>
            <span>{scene.mark}</span>
            <strong>{scene.title}</strong>
            <p>{scene.caption}</p>
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

      <nav className={styles.categoryRail} aria-label="商城动态分类">
        <button
          type="button"
          className={`${styles.categoryChip} ${activeCategoryId == null ? styles.categoryChipActive : ''}`}
          onClick={() => {
            setActiveCategoryId(undefined);
            setSearchParams(keyword ? { keyword } : {});
          }}
        >全部</button>
        {categories.map((category) => (
          <button
            key={category.categoryId}
            type="button"
            className={`${styles.categoryChip} ${activeCategoryId === category.categoryId ? styles.categoryChipActive : ''}`}
            onClick={() => {
              setActiveCategoryId(category.categoryId);
              const next: Record<string, string> = { scene: category.categoryCode };
              if (keyword) next.keyword = keyword;
              setSearchParams(next);
            }}
          >{category.categoryName}</button>
        ))}
      </nav>
      {categoryError && (
        <div className={styles.contextNotice} role="alert">
          <span>动态分类暂时无法加载：{categoryError}。当前仍可浏览全部真实商品。</span>
          <Button type="link" onClick={() => window.location.reload()}>重新加载分类</Button>
        </div>
      )}

      <ZkSectionTitle
        title={keyword ? `“${keyword}”的搜索结果` : activeCategory?.categoryName ?? '正在售卖'}
        description={!loading ? `共 ${total} 件真实商品；无商品时不填充演示数据。` : '正在查询真实商品数据。'}
      />

      <section id="mall-products">
        {loading ? (
          <ZkState kind="loading" title="正在加载商城商品" />
        ) : error ? (
          <ZkState kind="error" title="商城暂时无法加载" description={error} onAction={() => void loadProducts()} />
        ) : products.length === 0 ? (
          <ZkState
            title={keyword ? '没有找到相关商品' : '当前场景还没有在售商品'}
            description={keyword ? '请尝试更换商品、品牌或商家关键词。' : '商家按真实分类上架后会展示在这里，不使用假酒店、饭店或景区数据。'}
            actionText={keyword ? '清空搜索' : undefined}
            onAction={keyword ? () => { setKeyword(''); setKeywordInput(''); } : undefined}
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
                  onKeyDown={(event) => event.key === 'Enter' && navigate(`/products/${product.productId}`)}
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
      <div className={styles.contextNotice}>
        <CheckCircleOutlined /> 商品价格、库存、优惠、订单状态和核销资格均以后端实时结果为准。
      </div>
    </main>
  );
}
