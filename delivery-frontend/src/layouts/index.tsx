import { ConfigProvider, Spin } from 'antd';
import { Outlet } from 'umi';
import { ShopProvider, useShop } from '@/app/ShopContext';
import { commerceTheme } from '@/app/theme';
import { AppChrome } from '@/components/AppChrome';
import { isWechatBrowser } from '@/utils/shop';
import styles from '@/styles/commerce.less';
import './index.less';

function CommerceApplication() {
  const { authLoading } = useShop();
  if (authLoading) {
    return <main className={styles.authShell}><Spin size="large" /></main>;
  }
  if (!isWechatBrowser()) {
    return (
      <main className={styles.wechatOnlyPage}>
        <section className={styles.wechatOnlyCard}>
          <div className={styles.wechatOnlyIcon}>微</div>
          <h1>请在微信中打开</h1>
          <p>当前版本仅开放微信内使用，请将页面链接发送到微信后重新打开。</p>
        </section>
      </main>
    );
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
