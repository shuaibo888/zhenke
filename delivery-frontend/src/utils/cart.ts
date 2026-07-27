import type { Product, ReportAttribution } from '@/types';

export interface CartItem {
  cartItemId?: number;
  product: Product;
  quantity: number;
  attribution?: ReportAttribution;
}

export function getCartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
}
