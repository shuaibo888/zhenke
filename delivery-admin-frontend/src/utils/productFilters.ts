import type { ManagedProduct, ProductCategory, ProductStatus } from '@/types';

export type ProductCategoryFilter = ProductCategory | 'all';

export type ProductStatusFilter = ProductStatus | 'all' | 'trial';

export interface ProductFilterState {
  category: ProductCategoryFilter;
  status: ProductStatusFilter;
  keyword: string;
  getMerchantName: (merchantId: number) => string;
  trialProductIds?: number[];
}

export function filterProducts(products: ManagedProduct[], filters: ProductFilterState) {
  const normalizedKeyword = filters.keyword.trim().toLowerCase();

  return products.filter((product) => {
    if (filters.category !== 'all' && product.category !== filters.category) {
      return false;
    }

    if (filters.status === 'trial') {
      if (!filters.trialProductIds?.includes(product.id)) {
        return false;
      }
    } else if (filters.status !== 'all' && product.status !== filters.status) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    return [product.title, product.artisanName, filters.getMerchantName(product.merchantId)]
      .some((value) => value.toLowerCase().includes(normalizedKeyword));
  });
}
