import { useAdminPageProps } from '@/app/AdminPageContext';
import CouponModule from '@/modules/coupons';

export default function CouponsPage() {
  return <CouponModule {...useAdminPageProps('coupons')} />;
}
