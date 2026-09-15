import { useEffect, useState } from 'react';
import { Link } from 'umi';
import { fetchPublicProduct, type PublicProductDto } from '@/services/shopContent';
import styles from './index.module.less';

// 首页固定四个商品位；调整选品时只修改 ID，名称、封面和售价均读取商品实时数据。
const HOME_PRODUCT_IDS = [12, 13, 14, 15] as const;
const priceFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });

export function HomeProducts() {
  const [products, setProducts] = useState<Array<PublicProductDto | null>>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.allSettled(HOME_PRODUCT_IDS.map((id) => fetchPublicProduct(id))).then((results) => {
      if (!active) return;
      setProducts(results.map((result) => result.status === 'fulfilled' ? result.value : null));
      setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  return (
    <section className={styles.productSection} aria-label="商品推荐" aria-busy={loading}>
      <h2 className={styles.productHeading}>赛事官方甄选馆</h2>
      <div className={styles.productStrip}>
      {HOME_PRODUCT_IDS.map((id, index) => {
        const product = products[index];
        if (!product) return (
          <div key={id} className={styles.productSlot}>
            <div className={styles.productPlaceholder}>
              {!loading && <button type="button" onClick={() => setAttempt((value) => value + 1)}>重新加载</button>}
            </div>
            <span className={styles.productName} aria-hidden="true">—</span>
            <span className={styles.productPending}>{loading ? '加载中' : '暂不可用'}</span>
          </div>
        );
        const price = priceFormatter.format(Number(product.price));
        return (
          <Link key={id} className={styles.productSlot} to={`/products/${id}`} aria-label={`${product.productName}，${price}元，查看商品详情`}>
            <div className={styles.productCover}>
              <span aria-hidden="true">暂无图片</span>
              <img src={product.coverUrl} alt={product.productName} decoding="async" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />
            </div>
            <span className={styles.productName} title={product.productName}>{product.productName}</span>
            <span className={styles.productPrice}><small>¥</small>{price}</span>
          </Link>
        );
      })}
      </div>
    </section>
  );
}
