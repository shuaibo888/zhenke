import { useAdminPageProps } from '@/app/AdminPageContext';
import TrialsModule from '@/modules/trials';

export default function TrialsPage() {
  return <TrialsModule {...useAdminPageProps('trials')} />;
}
