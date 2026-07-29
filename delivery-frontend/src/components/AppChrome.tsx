import {
  DownOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge, Button, Dropdown, message } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { getCartCount } from '@/utils/shop';
import { AddressManager } from './AddressManager';
import { CartDrawer } from './CartDrawer';
import styles from '@/styles/commerce.less';

function avatar(user: NonNullable<ReturnType<typeof useShop>['user']>) {
  if (user.avatarType === 'image' && user.avatarImage) return <img src={user.avatarImage} alt={user.name} />;
  return <span>{(user.name || user.username || '甄').slice(0, 1)}</span>;
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, cart, logout } = useShop();
  const [cartOpen, setCartOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const reportQuery = searchParams.get('report');
  const productQuery = searchParams.get('product');
  const paymentOrderId = Number(searchParams.get('wechatPayOrderId'));
  const isPaymentReturn = Number.isSafeInteger(paymentOrderId) && paymentOrderId > 0
    && ((searchParams.has('code') && searchParams.has('state'))
      || searchParams.get('wechatPayReturn') === '1');
  const authPage = location.pathname.startsWith('/auth');
  const checkoutPage = location.pathname.startsWith('/checkout');
  const detailPage = location.pathname.startsWith('/reports/')
    || location.pathname.startsWith('/products/')
    || checkoutPage
    || (location.pathname === '/' && Boolean(reportQuery || productQuery));
  const profileActive = location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/checkout')
    || isPaymentReturn;
  const cartCount = getCartCount(cart);

  const openProtected = (path: string) => {
    if (!user) {
      message.info('请先登录');
      navigate('/auth');
      return;
    }
    navigate(path);
  };

  return (
    <>
      <div className={`${styles.appShell} ${authPage ? styles.authPage : ''}`}>
        {!detailPage && !authPage && (
          <header className={styles.masthead}>
            <button type="button" className={styles.brandLockup} onClick={() => navigate('/')}>
              <h1>㤫者商城</h1>
            </button>
            <div className={styles.headerActions}>
              {user ? (
                <>
                  <Button icon={<ShoppingCartOutlined />} onClick={() => setCartOpen(true)}>
                    购物车 {cartCount}
                  </Button>
                  <Button className={styles.addressButton} icon={<EnvironmentOutlined />} onClick={() => setAddressOpen(true)}>
                    收货地址
                  </Button>
                  <div className={styles.accountMenu}>
                    <Dropdown
                      trigger={['hover', 'click']}
                      placement="bottomRight"
                      arrow
                      classNames={{ root: styles.accountPopup }}
                      menu={{
                        items: [{ key: 'logout', danger: true, icon: <LogoutOutlined />, label: '退出登录' }],
                        onClick: async () => {
                          await logout();
                          navigate('/');
                          message.success('已退出登录');
                        },
                      }}
                    >
                      <button type="button" className={styles.accountButton} aria-label="打开账号操作菜单">
                        <span className={styles.accountAvatar}>{avatar(user)}</span>
                        <span className={styles.accountText}>
                          <span className={styles.accountName}>{user.name}</span>
                          <span className={styles.accountRole}>{user.roleName || '甄客'}</span>
                        </span>
                        <DownOutlined className={styles.accountChevron} />
                      </button>
                    </Dropdown>
                  </div>
                </>
              ) : (
                <Button type="primary" onClick={() => navigate('/auth')}>登录 / 注册</Button>
              )}
            </div>
          </header>
        )}

        {!authPage && (
          <nav className={styles.navBar} aria-label="主导航">
            <div className={styles.topNav}>
              <button
                type="button"
                className={!profileActive ? styles.activeTab : ''}
                onClick={() => navigate('/')}
              >
                <HomeOutlined />
                <span>首页</span>
              </button>
              <button
                type="button"
                className={profileActive ? styles.activeTab : ''}
                onClick={() => openProtected('/profile')}
              >
                <UserOutlined />
                <span>我的</span>
              </button>
            </div>
          </nav>
        )}

        {children}
      </div>

      {!checkoutPage && !authPage && (
        <Badge count={cartCount} size="small" className={styles.fixedCartBadge}>
          <Button
            aria-label="打开购物车"
            className={styles.fixedCartButton}
            type="primary"
            shape="circle"
            icon={<ShoppingCartOutlined />}
            onClick={() => user ? setCartOpen(true) : navigate('/auth')}
          />
        </Badge>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AddressManager open={addressOpen} onClose={() => setAddressOpen(false)} />
    </>
  );
}
