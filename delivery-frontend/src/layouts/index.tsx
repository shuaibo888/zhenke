import { ConfigProvider, Spin } from 'antd';
import { Outlet, useLocation } from 'umi';
import { ShopProvider, useShop } from '@/app/ShopContext';
import { commerceTheme } from '@/app/theme';
import { AppChrome } from '@/components/AppChrome';
import { captureWechatEntryUrl } from '@/utils/wechatEntryUrl';
import { useWechatBrowserChrome } from '@/hooks/useWechatBrowserChrome';
import styles from '@/styles/commerce.less';
import './index.less';

captureWechatEntryUrl();

function CommerceApplication() {
  const { authLoading } = useShop();
  const location = useLocation();
  useWechatBrowserChrome(location.pathname);
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
