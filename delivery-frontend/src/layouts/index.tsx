import { ConfigProvider, Spin } from 'antd';
import { Outlet, useLocation } from 'umi';
import { ShopProvider, useShop } from '@/app/ShopContext';
import { commerceTheme } from '@/app/theme';
import { AppChrome } from '@/components/AppChrome';
import { PostPublishLauncherProvider } from '@/components/PostPublishLauncher';
import { captureWechatEntryUrl } from '@/utils/wechatEntryUrl';
import { useWechatBrowserChrome } from '@/hooks/useWechatBrowserChrome';
import styles from '@/styles/commerce.less';
import './index.less';
import '@/styles/zhenke.less';

captureWechatEntryUrl();

// Ant Design's static message/modal helpers render outside the normal React tree.
// Give those helpers the same theme context so they do not fall back to an
// unthemed holder or emit dynamic-theme warnings at runtime.
ConfigProvider.config({
  holderRender: (children) => (
    <ConfigProvider theme={commerceTheme}>{children}</ConfigProvider>
  ),
});

function CommerceApplication() {
  const { authLoading } = useShop();
  const location = useLocation();
  useWechatBrowserChrome(location.pathname);
  if (authLoading) {
    return <main className={styles.authShell}><Spin size="large" /></main>;
  }
  return (
    <PostPublishLauncherProvider>
      <AppChrome>
        <Outlet />
      </AppChrome>
    </PostPublishLauncherProvider>
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
