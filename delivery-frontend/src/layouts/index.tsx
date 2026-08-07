import { ConfigProvider, Spin } from 'antd';
import { Outlet } from 'umi';
import { ShopProvider, useShop } from '@/app/ShopContext';
import { commerceTheme } from '@/app/theme';
import { AppChrome } from '@/components/AppChrome';
import styles from '@/styles/commerce.less';
import './index.less';

function CommerceApplication() {
  const { authLoading } = useShop();
  if (authLoading) {
    return <main className={styles.authShell}><Spin size="large" /></main>;
  }
  return (
    <AppChrome>
      <Outlet />
    </AppChrome>
  );
}

export default function Layout() {
  return (
    <ConfigProvider theme={commerceTheme}>
      <ShopProvider>
        <CommerceApplication />
      </ShopProvider>
    </ConfigProvider>
  );
}
