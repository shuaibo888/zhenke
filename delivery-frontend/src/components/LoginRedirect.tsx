import { Navigate, useLocation } from 'umi';
import { buildLoginPath } from '@/utils/safeRedirect';

export function LoginRedirect() {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={buildLoginPath(returnPath)} replace />;
}
