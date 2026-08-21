import { useAdminPageProps } from '@/app/AdminPageContext';
import UsersModule from '@/modules/users';

export default function UsersPage() {
  return <UsersModule {...useAdminPageProps('users')} />;
}
