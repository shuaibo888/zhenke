import { useAdminPageProps } from '@/app/AdminPageContext';
import MerchantsModule from '@/modules/merchants';

export default function MerchantsPage() {
  return <MerchantsModule {...useAdminPageProps('merchants')} />;
}
