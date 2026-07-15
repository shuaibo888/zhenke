import assert from 'node:assert/strict';
import type { ManagedProduct } from '@/types';
import { filterProducts, type ProductFilterState } from './productFilters';

const products: ManagedProduct[] = [
  {
    id: 1,
    merchantId: 101,
    title: '云南高山有机咖啡豆 200g',
    artisanName: '老李咖啡',
    category: 'verified',
    status: 'onSale',
    imageUrl: '',
    detail: '海拔 1600 米小批量水洗豆。',
    price: 128,
    cost: 66,
    stock: 42,
    sales: 61,
    verifyCount: 3,
  },
  {
    id: 2,
    merchantId: 102,
    title: '景德镇手作影青杯',
    artisanName: '观窑器物',
    category: 'local',
    status: 'onSale',
    imageUrl: '',
    detail: '胎体轻薄，釉色温润。',
    price: 268,
    cost: 130,
    stock: 18,
    sales: 22,
    verifyCount: 5,
  },
  {
    id: 3,
    merchantId: 101,
    title: '武夷山岩茶肉桂 80g',
    artisanName: '岩上茶舍',
    category: 'verified',
    status: 'offSale',
    imageUrl: '',
    detail: '中足火肉桂，桂皮香明显。',
    price: 158,
    cost: 79,
    stock: 26,
    sales: 31,
    verifyCount: 6,
  },
];

const merchantNames = new Map([
  [101, '老李咖啡'],
  [102, '观窑器物'],
]);

function ids(filters: Partial<ProductFilterState>) {
  return filterProducts(products, {
    category: 'all',
    status: 'all',
    keyword: '',
    getMerchantName: (merchantId) => merchantNames.get(merchantId) ?? '',
    ...filters,
  }).map((product) => product.id);
}

assert.deepEqual(ids({ category: 'verified' }), [1, 3]);
assert.deepEqual(ids({ status: 'offSale' }), [3]);
assert.deepEqual(ids({ keyword: '高山' }), [1]);
assert.deepEqual(ids({ keyword: '老李' }), [1, 3]);
assert.deepEqual(ids({ keyword: '观窑' }), [2]);
assert.deepEqual(ids({ category: 'verified', status: 'onSale', keyword: '老李' }), [1]);
assert.deepEqual(ids({ category: 'local', status: 'offSale' }), []);

console.log('product filters ok');
