import { Link } from 'umi';
import type { MallProductDto } from '@/services/shopContent';
import styles from '@/styles/storefront.module.less';

export function StoreProductCard({ product, showMerchant = true }: { product: MallProductDto; showMerchant?: boolean }) {
  const priceText = Number(product.price).toFixed(2);
  return (
    <Link className={styles.productCard} to={`/products/${product.productId}`}>
      <div className={styles.productImage}>
        <img src={product.coverUrl} alt={product.productName} loading="lazy" />
        {product.stockUnlimited !== '1' && product.stock <= 0 && <span>已售罄</span>}
      </div>
      <div className={styles.productBody}>
        {product.brandName && <span className={styles.productBrand} title={product.brandName}>{product.brandName}</span>}
        <h3 title={product.productName}>{product.productName}</h3>
        {showMerchant && <p title={product.merchantName}>{product.merchantName}</p>}
        <div className={`${styles.productPrice} ${priceText.length > 8 ? styles.productPriceLong : ''}`}><strong><small>¥</small>{priceText}</strong>{product.salesCount > 0 && <span>已售 {product.salesCount}</span>}</div>
      </div>
    </Link>
  );
}
