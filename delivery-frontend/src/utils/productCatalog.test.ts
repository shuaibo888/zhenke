import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Product, VerifyReport } from '@/types';
import { findProductForReport, getCatalogProducts } from './productCatalog';

const products: Product[] = [
  {
    id: 1,
    title: 'Coffee',
    artisanName: 'A',
    category: 'verified',
    imageUrl: '',
    cover: '',
    price: 128,
    isVerified: true,
    verifyCount: 3,
    detail: '',
    tags: [],
  },
  {
    id: 2,
    title: 'Cup',
    artisanName: 'B',
    category: 'local',
    imageUrl: '',
    cover: '',
    price: 268,
    isVerified: true,
    verifyCount: 5,
    detail: '',
    tags: [],
  },
  {
    id: 3,
    title: 'Honey',
    artisanName: 'C',
    category: 'verified',
    imageUrl: '',
    cover: '',
    price: 96,
    isVerified: true,
    verifyCount: 8,
    detail: '',
    tags: [],
  },
];

const reports: VerifyReport[] = [
  {
    id: 101,
    productId: 1,
    productTitle: 'Coffee',
    userId: 1,
    userName: 'A',
    userRole: 'zhenke',
    experience: '',
    shortcoming: '',
    fitCrowd: '',
    recommend: true,
    usefulCount: 0,
    createdAt: 'today',
  },
  {
    id: 103,
    productId: 3,
    productTitle: 'Honey',
    userId: 1,
    userName: 'A',
    userRole: 'zhenke',
    experience: '',
    shortcoming: '',
    fitCrowd: '',
    recommend: true,
    usefulCount: 0,
    createdAt: 'today',
  },
  {
    id: 102,
    productId: 2,
    productTitle: 'Cup',
    userId: 1,
    userName: 'A',
    userRole: 'zhenke',
    experience: '',
    shortcoming: '',
    fitCrowd: '',
    recommend: true,
    usefulCount: 0,
    createdAt: 'today',
  },
];

test('getCatalogProducts filters local specialties', () => {
  const result = getCatalogProducts(products, reports, 'local', 'latestVerified');

  assert.deepEqual(
    result.map((item) => item.title),
    ['Cup'],
  );
});

test('getCatalogProducts sorts by latest verification report', () => {
  const result = getCatalogProducts(products, reports, 'all', 'latestVerified');

  assert.deepEqual(
    result.map((item) => item.title),
    ['Honey', 'Cup', 'Coffee'],
  );
});

test('getCatalogProducts sorts by price', () => {
  assert.deepEqual(
    getCatalogProducts(products, reports, 'all', 'priceAsc').map((item) => item.title),
    ['Honey', 'Coffee', 'Cup'],
  );
  assert.deepEqual(
    getCatalogProducts(products, reports, 'all', 'priceDesc').map((item) => item.title),
    ['Cup', 'Coffee', 'Honey'],
  );
});

test('findProductForReport returns the product referenced by a verification report', () => {
  assert.equal(findProductForReport(products, reports[0])?.title, 'Coffee');
  assert.equal(findProductForReport(products, { ...reports[0], productId: 999 }), null);
});
