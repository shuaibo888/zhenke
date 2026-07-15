import assert from 'node:assert/strict';
import type { ManagedProduct } from '@/types';
import { saveProductDraft, type ProductDraft } from './productEditor';

const products: ManagedProduct[] = [
  {
    id: 1,
    merchantId: 101,
    title: '云南高山有机咖啡豆 200g',
    artisanName: '老李咖啡',
    category: 'verified',
    status: 'onSale',
    imageUrl: '/goods/cafedou.jpg',
    detail: '海拔 1600 米小批量水洗豆。',
    price: 128,
    cost: 66,
    stock: 42,
    sales: 61,
    verifyCount: 3,
  },
];

const draft: ProductDraft = {
  merchantId: 101,
  title: '云南高山有机咖啡豆 500g',
  artisanName: '老李咖啡',
  category: 'verified',
  status: 'onSale',
  imageUrl: '/goods/cafedou-new.jpg',
  detail: '新批次坚果香更明显，适合手冲。',
  price: 198,
  cost: 96,
  stock: 30,
};

const created = saveProductDraft(products, draft, null);
assert.equal(created.length, 2);
assert.equal(created[0].id, 2);
assert.equal(created[0].detail, '新批次坚果香更明显，适合手冲。');
assert.equal(created[0].imageUrl, '/goods/cafedou-new.jpg');
assert.equal(created[0].sales, 0);
assert.equal(created[0].verifyCount, 0);

const updated = saveProductDraft(products, { ...draft, title: '云南高山有机咖啡豆 250g' }, 1);
assert.equal(updated.length, 1);
assert.equal(updated[0].id, 1);
assert.equal(updated[0].title, '云南高山有机咖啡豆 250g');
assert.equal(updated[0].detail, '新批次坚果香更明显，适合手冲。');
assert.equal(updated[0].sales, 61);
assert.equal(updated[0].verifyCount, 3);

console.log('product editor ok');
