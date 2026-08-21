import { useAdminPageProps } from '@/app/AdminPageContext';
import ReportsModule from '@/modules/reports';

export default function ReportsPage() {
  return <ReportsModule {...useAdminPageProps('reports')} />;
}
