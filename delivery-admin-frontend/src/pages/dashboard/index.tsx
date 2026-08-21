import { useAdminPageProps } from '@/app/AdminPageContext';
import DashboardModule from '@/modules/dashboard';

export default function DashboardPage() {
  return <DashboardModule {...useAdminPageProps('dashboard')} />;
}
