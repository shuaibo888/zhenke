import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Product } from '@/types';
import { addProductToCart, changeCartItemQuantity, getCartCount, getCartTotal, removeCartItem } from './cart';

const coffee: Product = {
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
};

const cup: Product = {
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
};

test('addProductToCart adds a new product and increments existing quantity', () => {
  const withCoffee = addProductToCart([], coffee);
  const withCoffeeAgain = addProductToCart(withCoffee, coffee);

  assert.equal(withCoffeeAgain.length, 1);
  assert.equal(withCoffeeAgain[0].quantity, 2);
});

test('changeCartItemQuantity removes item when quantity becomes zero', () => {
  const cart = addProductToCart(addProductToCart([], coffee), cup);
  const changed = changeCartItemQuantity(cart, coffee.id, 0);

  assert.deepEqual(
    changed.map((item) => item.product.title),
    ['Cup'],
  );
});

test('removeCartItem removes only the matching product', () => {
  const cart = addProductToCart(addProductToCart([], coffee), cup);
  const changed = removeCartItem(cart, cup.id);

  assert.deepEqual(
    changed.map((item) => item.product.title),
    ['Coffee'],
  );
});

test('getCartCount and getCartTotal summarize cart items', () => {
  const cart = addProductToCart(addProductToCart(addProductToCart([], coffee), coffee), cup);

  assert.equal(getCartCount(cart), 3);
  assert.equal(getCartTotal(cart), 524);
});

test('latest report attribution replaces prior attribution while quantity increments', () => {
  const first = { sourceReportId: 101 };
  const latest = { sourceReportId: 105 };
  const cart = addProductToCart(addProductToCart([], coffee, first), coffee, latest);

  assert.equal(cart[0].quantity, 2);
  assert.deepEqual(cart[0].attribution, latest);
});
