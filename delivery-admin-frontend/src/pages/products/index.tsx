import { useAdminPageProps } from '@/app/AdminPageContext';
import ProductsModule from '@/modules/products';

export default function ProductsPage() {
  return <ProductsModule {...useAdminPageProps('products')} />;
}
