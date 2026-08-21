import { useAdminPageProps } from '@/app/AdminPageContext';
import OrdersModule from '@/modules/orders';

export default function OrdersPage() {
  return <OrdersModule {...useAdminPageProps('orders')} />;
}
