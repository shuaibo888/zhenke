import type { ManagedProduct, ProductCategory, ProductStatus } from '@/types';

export interface ProductDraft {
  merchantId: number;
  title: string;
  artisanName: string;
  category: ProductCategory;
  status: ProductStatus;
  imageUrl: string;
  detail: string;
  price: number;
  cost: number;
  stock: number;
}

export function saveProductDraft(products: ManagedProduct[], draft: ProductDraft, editingProductId: number | null) {
  if (editingProductId) {
    return products.map((product) =>
      product.id === editingProductId
        ? {
            ...product,
            ...draft,
          }
        : product,
    );
  }

  const nextProduct: ManagedProduct = {
    ...draft,
    id: Math.max(...products.map((product) => product.id), 0) + 1,
    sales: 0,
    verifyCount: 0,
  };

  return [nextProduct, ...products];
}
