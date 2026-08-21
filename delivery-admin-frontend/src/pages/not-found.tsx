import { Navigate } from '@umijs/renderer-react';

export default function AdminNotFoundPage() {
  return <Navigate to="/dashboard" replace />;
}
