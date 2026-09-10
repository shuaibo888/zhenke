import { Link } from 'umi';
import type { MallProductDto } from '@/services/shopContent';
import styles from '@/styles/storefront.module.less';

export function StoreProductCard({ product, showMerchant = true }: { product: MallProductDto; showMerchant?: boolean }) {
  return (
    <Link className={styles.productCard} to={`/products/${product.productId}`}>
      <div className={styles.productImage}>
        <img src={product.coverUrl} alt={product.productName} loading="lazy" />
        {product.stockUnlimited !== '1' && product.stock <= 0 && <span>已售罄</span>}
      </div>
      <div className={styles.productBody}>
        <h3>{product.productName}</h3>
        {showMerchant && <p>{product.merchantName}</p>}
        <div className={styles.productPrice}><strong><small>¥</small>{Number(product.price).toFixed(2)}</strong>{product.salesCount > 0 && <span>已售 {product.salesCount}</span>}</div>
      </div>
    </Link>
  );
}
