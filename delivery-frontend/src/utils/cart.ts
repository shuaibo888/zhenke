import type { Product, ReportAttribution } from '@/types';

export interface CartItem {
  product: Product;
  quantity: number;
  attribution?: ReportAttribution;
}

export function addProductToCart(items: CartItem[], product: Product, attribution?: ReportAttribution): CartItem[] {
  const existing = items.find((item) => item.product.id === product.id);

  if (!existing) {
    return [...items, { product, quantity: 1, attribution }];
  }

  return items.map((item) =>
    item.product.id === product.id
      ? { ...item, quantity: item.quantity + 1, attribution: attribution ?? item.attribution }
      : item,
  );
}

export function changeCartItemQuantity(items: CartItem[], productId: number, quantity: number): CartItem[] {
  if (quantity <= 0) return removeCartItem(items, productId);
  return items.map((item) => (item.product.id === productId ? { ...item, quantity } : item));
}

export function removeCartItem(items: CartItem[], productId: number): CartItem[] {
  return items.filter((item) => item.product.id !== productId);
}

export function getCartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
}
