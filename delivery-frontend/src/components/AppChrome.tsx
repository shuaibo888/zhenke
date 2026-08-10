import {
  AppstoreOutlined,
  DownOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  LogoutOutlined,
  CloseOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge, Button, Dropdown, message } from 'antd';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { getCartCount } from '@/utils/shop';
import { AddressManager } from './AddressManager';
import { CartDrawer } from './CartDrawer';
import { NativePayModal } from './NativePayModal';
import { ProfileBackButton } from './ProfileBackButton';
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
  const [homeSearchOpen, setHomeSearchOpen] = useState(false);
  const [homeSearchValue, setHomeSearchValue] = useState('');
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
  const homePage = location.pathname === '/' && !detailPage;
  const homeContent = searchParams.get('content')?.toUpperCase();
  const homeKeyword = (searchParams.get('keyword') ?? '').trim();
  const mallActive = location.pathname.startsWith('/mall');
  const profileLanding = location.pathname === '/profile';
  const profileSubPage = location.pathname.startsWith('/profile/');
  const profileActive = location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/checkout')
    || isPaymentReturn;
  const cartCount = getCartCount(cart);

  useEffect(() => {
    setHomeSearchValue(homeKeyword);
    setHomeSearchOpen(Boolean(homeKeyword));
  }, [homeKeyword]);

  const openProtected = (path: string) => {
    if (!user) {
      message.info('请先登录');
      navigate('/auth');
      return;
    }
    navigate(path);
  };

  const selectHomeContent = (content: 'REPORT' | 'TRIAL') => {
    if (homeContent === content && !homeKeyword) {
      navigate('/');
    } else {
      navigate(`/?content=${content}`);
    }
    setHomeSearchOpen(false);
  };

  const submitHomeSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = homeSearchValue.trim();
    if (!keyword) {
      message.info('请输入搜索关键词');
      return;
    }
    navigate(`/?keyword=${encodeURIComponent(keyword)}`);
  };

  const closeHomeSearch = () => {
    setHomeSearchOpen(false);
    setHomeSearchValue('');
    if (homeKeyword) navigate('/');
  };

  return (
    <>
      <div className={`${styles.appShell} ${authPage ? styles.authPage : ''} ${profileLanding ? styles.profilePage : ''} ${mallActive ? styles.mallApp : ''}`}>
        {!detailPage && !authPage && !mallActive && !profileLanding && (
          <header className={`${styles.masthead} ${homePage ? styles.homeMasthead : ''}`}>
            {homePage && homeSearchOpen ? (
              <form className={styles.homeGlobalSearchForm} role="search" onSubmit={submitHomeSearch}>
                <SearchOutlined aria-hidden="true" />
                <input
                  autoFocus
                  maxLength={50}
                  value={homeSearchValue}
                  aria-label="全局搜索"
                  placeholder="搜索试用、甄客验、商品或商家"
                  onChange={(event) => setHomeSearchValue(event.target.value)}
                />
                <button type="submit">搜索</button>
                <button type="button" className={styles.homeSearchClose} aria-label="关闭搜索" onClick={closeHomeSearch}>
                  <CloseOutlined />
                </button>
              </form>
            ) : homePage ? (
              <div className={styles.homeDiscoveryNav} aria-label="首页内容分类">
                <div className={styles.homeNavRail}>
                  <button
                    type="button"
                    className={`${styles.homeNavItem} ${styles.homeNavSide} ${homeContent === 'REPORT' ? styles.homeContentActive : ''}`}
                    aria-pressed={homeContent === 'REPORT'}
                    onClick={() => selectHomeContent('REPORT')}
                  >
                    <span>甄客验</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.homeNavItem} ${styles.homeNavSide} ${homeContent === 'TRIAL' ? styles.homeContentActive : ''}`}
                    aria-pressed={homeContent === 'TRIAL'}
                    onClick={() => selectHomeContent('TRIAL')}
                  >
                    <span>试用</span>
                  </button>
                </div>
                <button
                  type="button"
                  className={`${styles.homeNavItem} ${styles.homeNavBrand} ${!homeContent ? styles.homeContentActive : ''}`}
                  aria-pressed={!homeContent}
                  onClick={() => navigate('/')}
                >
                  <span className={styles.homeBrandDepth} data-text="㤫者商城">㤫者商城</span>
                </button>
                <button
                  type="button"
                  className={styles.homeSearchButton}
                  aria-label="打开全局搜索"
                  onClick={() => setHomeSearchOpen(true)}
                >
                  <SearchOutlined />
                </button>
              </div>
            ) : profileSubPage ? (
              <div className={styles.mastheadBrandGroup}>
                <ProfileBackButton onClick={() => navigate('/profile')} />
                <button type="button" className={styles.brandLockup} onClick={() => navigate('/')}>
                  <h1>㤫者商城</h1>
                </button>
              </div>
            ) : (
              <button type="button" className={styles.brandLockup} onClick={() => navigate('/')}>
                <h1>㤫者商城</h1>
              </button>
            )}
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
                className={!mallActive && !profileActive ? styles.activeTab : ''}
                aria-current={!mallActive && !profileActive ? 'page' : undefined}
                onClick={() => navigate('/')}
              >
                <span className={styles.dockIcon}><HomeOutlined /></span>
                <span className={styles.dockLabel}>首页</span>
              </button>
              <button
                type="button"
                className={mallActive ? styles.activeTab : ''}
                aria-current={mallActive ? 'page' : undefined}
                onClick={() => navigate('/mall')}
              >
                <span className={styles.dockIcon}><AppstoreOutlined /></span>
                <span className={styles.dockLabel}>商城</span>
              </button>
              <button
                type="button"
                className={profileActive ? styles.activeTab : ''}
                aria-current={profileActive ? 'page' : undefined}
                onClick={() => openProtected('/profile')}
              >
                <span className={styles.dockIcon}><UserOutlined /></span>
                <span className={styles.dockLabel}>我的</span>
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
      <NativePayModal />
    </>
  );
}
