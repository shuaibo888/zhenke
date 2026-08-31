import {
  AppstoreOutlined,
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  LogoutOutlined,
  ReadOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge, Dropdown, message } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { buildLoginPath } from '@/utils/safeRedirect';
import { getCartCount } from '@/utils/shop';
import { AddressManager } from './AddressManager';
import { CartDrawer } from './CartDrawer';
import { NativePayModal } from './NativePayModal';
import styles from '@/styles/zhenke.less';

type MainNavItem = {
  key: 'home' | 'posts' | 'mall' | 'profile';
  label: string;
  path: string;
  icon: ReactNode;
  protected?: boolean;
};

const navItems: MainNavItem[] = [
  { key: 'home', label: '首页', path: '/', icon: <HomeOutlined /> },
  { key: 'posts', label: '甄客帖', path: '/posts', icon: <ReadOutlined /> },
  { key: 'mall', label: '商城', path: '/mall', icon: <AppstoreOutlined /> },
  { key: 'profile', label: '我的', path: '/profile', icon: <UserOutlined />, protected: true },
];

function getActiveNav(pathname: string): MainNavItem['key'] {
  if (pathname.startsWith('/posts') || pathname.startsWith('/places')) return 'posts';
  if (pathname.startsWith('/mall') || pathname.startsWith('/products')
    || pathname.startsWith('/merchants') || pathname.startsWith('/reports')) return 'mall';
  if (pathname.startsWith('/profile') || pathname.startsWith('/checkout')) return 'profile';
  return 'home';
}

function UserAvatar() {
  const { user } = useShop();
  if (!user) return null;
  return (
    <span className={styles.userAvatar}>
      {user.avatarType === 'image' && user.avatarImage
        ? <img src={user.avatarImage} alt="" />
        : (user.name || user.username || '甄').slice(0, 1)}
    </span>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, cart, logout } = useShop();
  const [cartOpen, setCartOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const activeNav = getActiveNav(location.pathname);
  const cartCount = getCartCount(cart);
  const authPage = location.pathname.startsWith('/auth') || location.pathname.startsWith('/sso/');
  const checkoutPage = location.pathname.startsWith('/checkout');
  const publishPage = location.pathname === '/posts/publish';
  const immersiveDetailPage = location.pathname.startsWith('/products/')
    || location.pathname.startsWith('/reports/');
  const contextualPublishPage = /^\/(?:places|enjoy)\/\d+\/?$/.test(location.pathname);
  const hideMobileNav = authPage || checkoutPage || publishPage || immersiveDetailPage;
  const showCartFloat = !authPage && !checkoutPage
    && (activeNav === 'mall' || location.pathname.startsWith('/products'));

  const openPath = (item: MainNavItem) => {
    if (item.protected && !user) {
      message.info('登录后可查看内容、订单和权益');
      navigate(buildLoginPath(item.path));
      return;
    }
    navigate(item.path);
  };

  const goPublish = () => {
    if (!user) {
      message.info('登录后才能发布甄客帖');
      navigate(buildLoginPath('/posts/publish'));
      return;
    }
    navigate('/posts/publish');
  };

  const brand = (
    <button type="button" className={styles.brand} onClick={() => navigate('/')} aria-label="返回甄客行首页">
      <span className={styles.brandMark}>甄</span>
      <span className={styles.brandCopy}>
        <strong>甄客行</strong>
        <small>城市生活 · 真实分享</small>
      </span>
    </button>
  );

  return (
    <div className={styles.appShell}>
      {!authPage && (
        <>
          <header className={styles.desktopHeader}>
            <div className={styles.headerInner}>
              {brand}
              <nav className={styles.desktopNav} aria-label="甄客行主导航">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.navItem} ${activeNav === item.key ? styles.navActive : ''}`}
                    aria-current={activeNav === item.key ? 'page' : undefined}
                    onClick={() => openPath(item)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className={styles.headerActions}>
                {user && (
                  <button type="button" className={styles.circleAction} aria-label="收货地址" onClick={() => setAddressOpen(true)}>
                    <EnvironmentOutlined />
                  </button>
                )}
                <Badge count={cartCount} size="small">
                  <button
                    type="button"
                    className={styles.circleAction}
                    aria-label="购物车"
                    onClick={() => user ? setCartOpen(true) : navigate(buildLoginPath('/mall'))}
                  >
                    <ShoppingCartOutlined />
                  </button>
                </Badge>
                {user ? (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'profile', icon: <SettingOutlined />, label: '账号与设置' },
                        { type: 'divider' },
                        { key: 'logout', danger: true, icon: <LogoutOutlined />, label: '退出登录' },
                      ],
                      onClick: async ({ key }) => {
                        if (key === 'profile') navigate('/profile');
                        if (key === 'logout') {
                          await logout();
                          navigate('/');
                          message.success('已安全退出');
                        }
                      },
                    }}
                  >
                    <button type="button" className={styles.userAction}>
                      <UserAvatar />
                      <span>{user.name || user.username}</span>
                      <DownOutlined />
                    </button>
                  </Dropdown>
                ) : (
                  <button type="button" className={styles.loginAction} onClick={() => navigate(buildLoginPath(`${location.pathname}${location.search}${location.hash}`))}>
                    登录 / 注册
                  </button>
                )}
              </div>
            </div>
          </header>

          <header className={styles.mobileTopbar}>
            {brand}
            <div className={styles.headerActions}>
              <Badge count={cartCount} size="small">
                <button
                  type="button"
                  className={styles.circleAction}
                  aria-label="购物车"
                  onClick={() => user ? setCartOpen(true) : navigate(buildLoginPath('/mall'))}
                >
                  <ShoppingCartOutlined />
                </button>
              </Badge>
              {!user && (
                <button type="button" className={styles.loginAction} onClick={() => navigate(buildLoginPath(`${location.pathname}${location.search}${location.hash}`))}>
                  登录
                </button>
              )}
            </div>
          </header>
        </>
      )}

      {children}

      {!hideMobileNav && (
        <nav className={styles.mobileNav} aria-label="移动端主导航">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.mobileNavItem} ${activeNav === item.key ? styles.mobileNavActive : ''}`}
              aria-current={activeNav === item.key ? 'page' : undefined}
              onClick={() => openPath(item)}
            >
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      )}

      {!authPage && !checkoutPage && !publishPage && !immersiveDetailPage && !contextualPublishPage && (
        <button type="button" className={styles.floatingPublish} onClick={goPublish}>
          <EditOutlined />
          <span className={styles.floatingPublishText}>发布甄客帖</span>
        </button>
      )}

      {showCartFloat && (
        <div className={styles.cartFloat}>
          <Badge count={cartCount}>
            <button type="button" className={styles.circleAction} onClick={() => user ? setCartOpen(true) : navigate(buildLoginPath('/mall'))}>
              <ShoppingCartOutlined />
            </button>
          </Badge>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AddressManager open={addressOpen} onClose={() => setAddressOpen(false)} />
      <NativePayModal />
    </div>
  );
}
