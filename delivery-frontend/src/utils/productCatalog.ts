import type { Product, ProductCategory, VerifyReport } from '@/types';

export type ProductCategoryFilter = ProductCategory | 'all';
export type ProductSortKey = 'latestVerified' | 'priceAsc' | 'priceDesc';

function getLatestReportId(productId: number, reports: VerifyReport[]) {
  return reports.reduce((latestId, report) => {
    if (report.productId !== productId) return latestId;
    return Math.max(latestId, report.id);
  }, 0);
}

export function getCatalogProducts(
  products: Product[],
  reports: VerifyReport[],
  category: ProductCategoryFilter,
  sortKey: ProductSortKey,
) {
  const filtered = products.filter((product) => {
    if (category === 'all') return true;
    if (category === 'verified') return product.isVerified;
    return product.category === category;
  });

  return [...filtered].sort((left, right) => {
    if (sortKey === 'priceAsc') return left.price - right.price;
    if (sortKey === 'priceDesc') return right.price - left.price;

    const latestDiff = getLatestReportId(right.id, reports) - getLatestReportId(left.id, reports);
    if (latestDiff !== 0) return latestDiff;
    return right.verifyCount - left.verifyCount;
  });
}

export function findProductForReport(products: Product[], report: VerifyReport) {
  return products.find((product) => product.id === report.productId) ?? null;
}
