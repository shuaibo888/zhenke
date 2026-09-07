import type { ProductCategory, ProductStatus } from '@/types';

export type ProductCategoryFilter = ProductCategory | 'all';

export type ProductStatusFilter = ProductStatus | 'all' | 'trial';
