import { Button, Modal, message } from 'antd';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { history } from 'umi';
import {
  addShopCartItem,
  checkoutShopCart,
  createShopOrders,
  deleteShopCartItem,
  fetchMyCoupons,
  fetchMyTrialApplications,
  fetchMyVerificationReports,
  fetchShopCart,
  fetchShopOrders,
  prepareWechatPayment,
  reconcileWechatPayment,
  updateShopCartItem,
  type ShopCartItemDto,
  type ShopCouponDto,
  type ShopOrderDto,
  type TrialApplicationDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import {
  createShopShippingAddress,
  deleteShopShippingAddress,
  fetchMyPointBalance,
  fetchShopCaptcha,
  fetchShopShippingAddresses,
  loginShopUser,
  logoutShopUser,
  registerShopUser,
  restoreShopSession,
  setDefaultShopShippingAddress,
  updateShopShippingAddress,
  type CaptchaState,
  type ShopPointBalance,
  type ShopShippingAddress,
  type ShopShippingAddressBody,
} from '@/services/shopAuth';
import type { AuthUser } from '@/utils/authRules';
import { registerAuthExpiredHandler, storeToken } from '@/services/apiClient';
import { clearWechatPaymentQuery, invokeWechatJsapi } from '@/utils/wechatPayment';
import { copyText } from '@/utils/shop';
import { PhoneBindingModal } from '@/components/PhoneBindingModal';

type AuthMode = 'login' | 'register';

interface ShopContextValue {
  user: AuthUser | null;
  authLoading: boolean;
  authSubmitting: boolean;
  authMode: AuthMode;
  captcha: CaptchaState;
  captchaLoading: boolean;
  captchaError: string;
  cart: ShopCartItemDto[];
  cartLoading: boolean;
  coupons: ShopCouponDto[];
  couponsLoading: boolean;
  orders: ShopOrderDto[];
  ordersLoading: boolean;
  trials: TrialApplicationDto[];
  trialsLoading: boolean;
  reports: VerificationReportDto[];
  reportsLoading: boolean;
  addresses: ShopShippingAddress[];
  addressesLoading: boolean;
  points: ShopPointBalance;
  pointsLoading: boolean;
  privateLoading: boolean;
  payingOrderId: number | null;
  nativePayment: { orderId: number; codeUrl: string } | null;
  setAuthMode: (mode: AuthMode) => void;
  loadCaptcha: () => Promise<void>;
  login: (username: string, password: string, code?: string) => Promise<void>;
  register: (username: string, password: string, code?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshCoupons: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshTrials: () => Promise<void>;
  refreshReports: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
  refreshPoints: () => Promise<void>;
  addToCart: (productId: number, quantity?: number, sourceReportId?: number) => Promise<void>;
  changeCartQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  removeCartItem: (cartItemId: number) => Promise<void>;
  checkoutCart: (addressId: number | null, userCouponIds?: number[]) => Promise<ShopOrderDto[]>;
  buyNow: (addressId: number | null, productId: number, quantity?: number, sourceReportId?: number, userCouponIds?: number[], fulfillmentType?: 'ONLINE' | 'OFFLINE') => Promise<ShopOrderDto[]>;
  payOrder: (orderId: number, authorization?: { code?: string; state?: string }) => Promise<void>;
  clearNativePayment: () => void;
  saveAddress: (body: ShopShippingAddressBody, addressId?: number) => Promise<void>;
  makeDefaultAddress: (addressId: number) => Promise<void>;
  removeAddress: (addressId: number) => Promise<void>;
  replaceOrder: (order: ShopOrderDto) => void;
  replaceTrial: (trial: TrialApplicationDto) => void;
  replaceReport: (report: VerificationReportDto) => void;
  setUser: (user: AuthUser | null) => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);
const emptyCaptcha: CaptchaState = { enabled: false, image: '', uuid: '' };
const emptyPoints: ShopPointBalance = {
  balance: 0,
  totalTransferredIn: 0,
  totalConsumed: 0,
  lastTransferTime: null,
};

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [captcha, setCaptcha] = useState<CaptchaState>(emptyCaptcha);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [cart, setCart] = useState<ShopCartItemDto[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [coupons, setCoupons] = useState<ShopCouponDto[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [orders, setOrders] = useState<ShopOrderDto[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [trials, setTrials] = useState<TrialApplicationDto[]>([]);
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [reports, setReports] = useState<VerificationReportDto[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [addresses, setAddresses] = useState<ShopShippingAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [points, setPoints] = useState<ShopPointBalance>(emptyPoints);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const [nativePayment, setNativePayment] = useState<{ orderId: number; codeUrl: string } | null>(null);
  const [authExpiredOpen, setAuthExpiredOpen] = useState(false);
  const [h5ReviewFallbackOpen, setH5ReviewFallbackOpen] = useState(false);
  const paymentReturnHandled = useRef(false);
  const authExpiredRef = useRef(false);
  const userRef = useRef<AuthUser | null>(null);
  const cartRefreshRef = useRef<Promise<void> | null>(null);
  const orderRefreshRef = useRef<Promise<void> | null>(null);
  const couponRefreshRef = useRef<Promise<void> | null>(null);
  const trialRefreshRef = useRef<Promise<void> | null>(null);
  const reportRefreshRef = useRef<Promise<void> | null>(null);
  const addressRefreshRef = useRef<Promise<void> | null>(null);
  const pointRefreshRef = useRef<Promise<void> | null>(null);
  const privateLoading = couponsLoading || ordersLoading || trialsLoading || reportsLoading || addressesLoading;

  useEffect(() => {
    const previousUserId = userRef.current?.id;
    userRef.current = user;
    cartRefreshRef.current = null;
    orderRefreshRef.current = null;
    couponRefreshRef.current = null;
    trialRefreshRef.current = null;
    reportRefreshRef.current = null;
    addressRefreshRef.current = null;
    pointRefreshRef.current = null;
    setCartLoading(false);
    setOrdersLoading(false);
    setCouponsLoading(false);
    setTrialsLoading(false);
    setReportsLoading(false);
    setAddressesLoading(false);
    setPointsLoading(false);
    if (previousUserId !== user?.id) setPoints(emptyPoints);
  }, [user]);

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaError('');
    try {
      setCaptcha(await fetchShopCaptcha());
    } catch (error) {
      setCaptcha({ enabled: true, image: '', uuid: '' });
      setCaptchaError(error instanceof Error ? error.message : '验证码加载失败');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([restoreShopSession(), fetchShopCaptcha()])
      .then(([sessionResult, captchaResult]) => {
        if (!mounted) return;
        if (sessionResult.status === 'fulfilled') setUser(sessionResult.value);
        if (captchaResult.status === 'fulfilled') {
          setCaptcha(captchaResult.value);
        } else {
          setCaptcha({ enabled: true, image: '', uuid: '' });
          setCaptchaError(captchaResult.reason instanceof Error ? captchaResult.reason.message : '验证码加载失败');
        }
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    registerAuthExpiredHandler(() => {
      if (authExpiredRef.current || !userRef.current) return;
      authExpiredRef.current = true;
      setAuthExpiredOpen(true);
    });
    return () => registerAuthExpiredHandler(null);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart([]);
      return;
    }
    if (cartRefreshRef.current) return cartRefreshRef.current;
    const currentUserId = user.id;
    setCartLoading(true);
    const request: Promise<void> = fetchShopCart()
      .then((items) => {
        if (userRef.current?.id === currentUserId) setCart(items);
      })
      .finally(() => {
        if (cartRefreshRef.current === request) {
          cartRefreshRef.current = null;
          setCartLoading(false);
        }
      });
    cartRefreshRef.current = request;
    return request;
  }, [user]);

  const refreshOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    if (orderRefreshRef.current) return orderRefreshRef.current;
    const currentUserId = user.id;
    setOrdersLoading(true);
    const request: Promise<void> = fetchShopOrders()
      .then((items) => {
        if (userRef.current?.id === currentUserId) setOrders(items);
      })
      .finally(() => {
        if (orderRefreshRef.current === request) {
          orderRefreshRef.current = null;
          setOrdersLoading(false);
        }
      });
    orderRefreshRef.current = request;
    return request;
  }, [user]);

  const refreshCoupons = useCallback(async () => {
    if (!user) {
      setCoupons([]);
      return;
    }
    if (couponRefreshRef.current) return couponRefreshRef.current;
    const currentUserId = user.id;
    setCouponsLoading(true);
    const request: Promise<void> = fetchMyCoupons()
      .then((items) => {
        if (userRef.current?.id === currentUserId) setCoupons(items);
      })
      .finally(() => {
        if (couponRefreshRef.current === request) {
          couponRefreshRef.current = null;
          setCouponsLoading(false);
        }
      });
    couponRefreshRef.current = request;
    return request;
  }, [user]);

  const refreshTrials = useCallback(async () => {
    if (!user) {
      setTrials([]);
      return;
    }
    if (trialRefreshRef.current) return trialRefreshRef.current;
    const currentUserId = user.id;
    setTrialsLoading(true);
    const request: Promise<void> = fetchMyTrialApplications()
      .then((items) => {
        if (userRef.current?.id === currentUserId) setTrials(items);
      })
      .finally(() => {
        if (trialRefreshRef.current === request) {
          trialRefreshRef.current = null;
          setTrialsLoading(false);
        }
      });
    trialRefreshRef.current = request;
    return request;
  }, [user]);

  const refreshReports = useCallback(async () => {
    if (!user) {
      setReports([]);
      return;
    }
    if (reportRefreshRef.current) return reportRefreshRef.current;
    const currentUserId = user.id;
    setReportsLoading(true);
    const request: Promise<void> = fetchMyVerificationReports()
      .then((items) => {
        if (userRef.current?.id === currentUserId) setReports(items);
      })
      .finally(() => {
        if (reportRefreshRef.current === request) {
          reportRefreshRef.current = null;
          setReportsLoading(false);
        }
      });
    reportRefreshRef.current = request;
    return request;
  }, [user]);

  const refreshAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      return;
    }
    if (addressRefreshRef.current) return addressRefreshRef.current;
    const currentUserId = user.id;
    setAddressesLoading(true);
    const request: Promise<void> = fetchShopShippingAddresses()
      .then((items) => {
        if (userRef.current?.id === currentUserId) setAddresses(items);
      })
      .finally(() => {
        if (addressRefreshRef.current === request) {
          addressRefreshRef.current = null;
          setAddressesLoading(false);
        }
      });
    addressRefreshRef.current = request;
    return request;
  }, [user]);

  const refreshPoints = useCallback(async () => {
    if (!user) {
      setPoints(emptyPoints);
      return;
    }
    if (pointRefreshRef.current) return pointRefreshRef.current;
    const currentUserId = user.id;
    setPointsLoading(true);
    const request: Promise<void> = fetchMyPointBalance()
      .then((balance) => {
        if (userRef.current?.id === currentUserId) setPoints(balance);
      })
      .finally(() => {
        if (pointRefreshRef.current === request) {
          pointRefreshRef.current = null;
          setPointsLoading(false);
        }
      });
    pointRefreshRef.current = request;
    return request;
  }, [user]);

  useEffect(() => {
    void refreshCart().catch(() => undefined);
  }, [refreshCart]);

  const login = useCallback(async (username: string, password: string, code?: string) => {
    setAuthSubmitting(true);
    try {
      const nextUser = await loginShopUser(username, password, code, captcha.uuid);
      setUser(nextUser);
      message.success(`欢迎回来，${nextUser.name}`);
    } finally {
      setAuthSubmitting(false);
    }
  }, [captcha.uuid]);

  const register = useCallback(async (username: string, password: string, code?: string) => {
    setAuthSubmitting(true);
    try {
      await registerShopUser(username, password, code, captcha.uuid);
      setAuthMode('login');
      await loadCaptcha();
      message.success('注册成功，请登录');
    } finally {
      setAuthSubmitting(false);
    }
  }, [captcha.uuid, loadCaptcha]);

  const clearSession = useCallback(() => {
    storeToken(null);
    userRef.current = null;
    setUser(null);
    setCart([]);
    setCoupons([]);
    setOrders([]);
    setTrials([]);
    setReports([]);
    setAddresses([]);
    setPoints(emptyPoints);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutShopUser();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const closeAuthExpiredModal = useCallback(() => {
    setAuthExpiredOpen(false);
    authExpiredRef.current = false;
    clearSession();
  }, [clearSession]);

  const handleAuthExpiredRelogin = useCallback(() => {
    closeAuthExpiredModal();
    history.replace('/auth');
  }, [closeAuthExpiredModal]);

  const handleAuthExpiredGuest = useCallback(() => {
    closeAuthExpiredModal();
    const { pathname } = history.location;
    if (pathname.startsWith('/profile') || pathname.startsWith('/checkout')) {
      history.replace('/');
    }
  }, [closeAuthExpiredModal]);

  const addToCart = useCallback(async (productId: number, quantity = 1, sourceReportId?: number) => {
    const saved = await addShopCartItem(productId, quantity, sourceReportId);
    setCart((items) => {
      const exists = items.some((item) => item.cartItemId === saved.cartItemId);
      return exists ? items.map((item) => item.cartItemId === saved.cartItemId ? saved : item) : [...items, saved];
    });
  }, []);

  const changeCartQuantity = useCallback(async (cartItemId: number, quantity: number) => {
    if (quantity <= 0) {
      await deleteShopCartItem(cartItemId);
      setCart((items) => items.filter((item) => item.cartItemId !== cartItemId));
      return;
    }
    const saved = await updateShopCartItem(cartItemId, quantity);
    setCart((items) => items.map((item) => item.cartItemId === cartItemId ? saved : item));
  }, []);

  const removeCartItem = useCallback(async (cartItemId: number) => {
    await deleteShopCartItem(cartItemId);
    setCart((items) => items.filter((item) => item.cartItemId !== cartItemId));
  }, []);

  const checkoutCart = useCallback(async (addressId: number | null, userCouponIds?: number[]) => {
    const created = await checkoutShopCart(addressId, userCouponIds);
    setCart([]);
    setOrders((items) => [...created, ...items]);
    if (userCouponIds?.length) void fetchMyCoupons().then(setCoupons).catch(() => undefined);
    return created;
  }, []);

  const buyNow = useCallback(async (
    addressId: number | null,
    productId: number,
    quantity = 1,
    sourceReportId?: number,
    userCouponIds?: number[],
    fulfillmentType?: 'ONLINE' | 'OFFLINE',
  ) => {
    const created = await createShopOrders({
      addressId,
      items: [{ productId, quantity, sourceReportId, fulfillmentType }],
      userCouponIds,
    });
    setOrders((items) => [...created, ...items]);
    if (userCouponIds?.length) void fetchMyCoupons().then(setCoupons).catch(() => undefined);
    return created;
  }, []);

  const clearNativePayment = useCallback(() => setNativePayment(null), []);

  const payOrder = useCallback(async (orderId: number, authorization: { code?: string; state?: string } = {}) => {
    setPayingOrderId(orderId);
    try {
      const returnUrl = new URL(`/checkout?orderId=${orderId}`, window.location.origin).toString();
      const prepared = await prepareWechatPayment(orderId, { ...authorization, returnUrl });
      if (prepared.type === 'OAUTH') {
        if (!prepared.oauthUrl) throw new Error('微信网页授权地址缺失');
        window.location.assign(prepared.oauthUrl);
        return;
      }
      if (prepared.type === 'H5') {
        if (!prepared.h5Url) throw new Error('H5 支付地址缺失');
        const redirectUrl = new URL(
          `/checkout?orderId=${orderId}&wechatPayOrderId=${orderId}&wechatPayReturn=1`,
          window.location.origin,
        ).toString();
        window.location.assign(`${prepared.h5Url}&redirect_url=${encodeURIComponent(redirectUrl)}`);
        return;
      }
      if (prepared.type === 'NATIVE') {
        if (!prepared.codeUrl) throw new Error('Native 支付二维码缺失');
        setNativePayment({ orderId, codeUrl: prepared.codeUrl });
        return;
      }
      if (!prepared.appId || !prepared.timeStamp || !prepared.nonceStr
        || !prepared.packageValue || !prepared.signType || !prepared.paySign) {
        throw new Error('微信 JSAPI 支付参数不完整');
      }
      clearWechatPaymentQuery();
      if (authorization.code || authorization.state) {
        history.replace(`/checkout?orderId=${orderId}`);
      }
      const result = await invokeWechatJsapi({
        appId: prepared.appId,
        timeStamp: prepared.timeStamp,
        nonceStr: prepared.nonceStr,
        package: prepared.packageValue,
        signType: prepared.signType,
        paySign: prepared.paySign,
      });
      if (result.err_msg === 'get_brand_wcpay_request:cancel') {
        message.info('你已取消微信支付，订单仍可在倒计时内继续支付');
        return;
      }
      if (result.err_msg !== 'get_brand_wcpay_request:ok') {
        throw new Error('微信支付未完成，请重试');
      }
      const refreshed = await reconcileWechatPayment(orderId);
      setOrders((items) => items.some((item) => item.orderId === orderId)
        ? items.map((item) => item.orderId === orderId ? refreshed : item)
        : [refreshed, ...items]);
      message.success(refreshed.status === 'PAID' ? '微信支付成功，等待商家发货' : '微信正在确认支付结果，请稍后刷新');
      if (refreshed.status === 'PAID') {
        history.replace(`/checkout/success?orderId=${orderId}`);
      }
    } catch (error) {
      if (authorization.code || authorization.state) clearWechatPaymentQuery();
      const reason = error instanceof Error ? error.message : '微信支付失败';
      if (reason.includes('H5 支付尚在审核')) {
        setH5ReviewFallbackOpen(true);
      } else {
        message.error(reason);
      }
    } finally {
      setPayingOrderId(null);
    }
  }, []);

  useEffect(() => {
    if (!user || paymentReturnHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = Number(params.get('wechatPayOrderId'));
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return;
    if (params.get('wechatPayReturn') === '1') {
      paymentReturnHandled.current = true;
      setPayingOrderId(orderId);
      reconcileWechatPayment(orderId)
        .then((refreshed) => {
          setOrders((items) => items.some((item) => item.orderId === orderId)
            ? items.map((item) => item.orderId === orderId ? refreshed : item)
            : [refreshed, ...items]);
          message.success(refreshed.status === 'PAID' ? '微信支付成功，等待商家发货' : '支付结果尚未确认，请稍后刷新订单');
          if (refreshed.status === 'PAID') {
            history.replace(`/checkout/success?orderId=${orderId}`);
          }
        })
        .catch((error) => message.error(error instanceof Error ? error.message : '微信支付结果确认失败'))
        .finally(() => {
          setPayingOrderId(null);
          clearWechatPaymentQuery();
        });
      return;
    }
    const code = params.get('code') ?? undefined;
    const state = params.get('state') ?? undefined;
    if (code && state) {
      paymentReturnHandled.current = true;
      void payOrder(orderId, { code, state });
    }
  }, [payOrder, user]);

  const saveAddress = useCallback(async (body: ShopShippingAddressBody, addressId?: number) => {
    if (addressId) await updateShopShippingAddress(addressId, body);
    else await createShopShippingAddress(body);
    setAddresses(await fetchShopShippingAddresses());
  }, []);

  const makeDefaultAddress = useCallback(async (addressId: number) => {
    await setDefaultShopShippingAddress(addressId);
    setAddresses(await fetchShopShippingAddresses());
  }, []);

  const removeAddress = useCallback(async (addressId: number) => {
    await deleteShopShippingAddress(addressId);
    setAddresses(await fetchShopShippingAddresses());
  }, []);

  const value = useMemo<ShopContextValue>(() => ({
    user,
    authLoading,
    authSubmitting,
    authMode,
    captcha,
    captchaLoading,
    captchaError,
    cart,
    cartLoading,
    coupons,
    couponsLoading,
    orders,
    ordersLoading,
    trials,
    trialsLoading,
    reports,
    reportsLoading,
    addresses,
    addressesLoading,
    points,
    pointsLoading,
    privateLoading,
    payingOrderId,
    nativePayment,
    setAuthMode,
    loadCaptcha,
    login,
    register,
    logout,
    refreshCart,
    refreshCoupons,
    refreshOrders,
    refreshTrials,
    refreshReports,
    refreshAddresses,
    refreshPoints,
    addToCart,
    changeCartQuantity,
    removeCartItem,
    checkoutCart,
    buyNow,
    payOrder,
    clearNativePayment,
    saveAddress,
    makeDefaultAddress,
    removeAddress,
    replaceOrder: (order) => setOrders((items) => items.map((item) => item.orderId === order.orderId ? order : item)),
    replaceTrial: (trial) => setTrials((items) => items.map((item) => item.applicationId === trial.applicationId ? trial : item)),
    replaceReport: (report) => setReports((items) => {
      const exists = items.some((item) => item.reportId === report.reportId);
      return exists ? items.map((item) => item.reportId === report.reportId ? report : item) : [report, ...items];
    }),
    setUser,
  }), [
    user, authLoading, authSubmitting, authMode, captcha, captchaLoading, captchaError,
    cart, cartLoading, coupons, couponsLoading, orders, ordersLoading, trials, trialsLoading,
    reports, reportsLoading, addresses, addressesLoading, points, pointsLoading, privateLoading, payingOrderId,
    nativePayment,
    loadCaptcha, login, register, logout, refreshCart, refreshCoupons, refreshOrders, refreshTrials,
    refreshReports, refreshAddresses, refreshPoints, addToCart, changeCartQuantity,
    removeCartItem, checkoutCart, buyNow, payOrder, clearNativePayment, saveAddress, makeDefaultAddress, removeAddress,
  ]);

  return (
    <ShopContext.Provider value={value}>
      {children}
      <PhoneBindingModal
        open={Boolean(user && !user.phoneBound)}
        onBound={setUser}
        onLogout={logout}
      />
      <Modal
        open={authExpiredOpen}
        title="登录状态已过期"
        footer={null}
        closable={false}
        mask={{ closable: false }}
        centered
        width={380}
      >
        <p style={{ margin: 0 }}>你的登录状态已过期，请选择重新登录，或清除登录状态后以游客身份继续浏览。</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button onClick={handleAuthExpiredGuest}>继续浏览</Button>
          <Button type="primary" onClick={handleAuthExpiredRelogin}>重新登录</Button>
        </div>
      </Modal>
      <Modal
        open={h5ReviewFallbackOpen}
        title="H5 支付尚未开通"
        footer={null}
        onCancel={() => setH5ReviewFallbackOpen(false)}
        centered
        width={420}
      >
        <p style={{ margin: '0 0 12px', lineHeight: 1.8 }}>
          当前 H5 支付尚在审核，手机浏览器暂无法直接唤起微信收银台。请复制官网地址，在微信客户端中打开后即可正常支付。
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <code
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(0,0,0,0.04)',
              fontSize: 13,
              userSelect: 'all',
            }}
          >
            {window.location.origin}
          </code>
          <Button
            onClick={() => void copyText(window.location.origin).then(() => message.success('网址已复制，请在微信中打开'))}
          >
            复制
          </Button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={() => setH5ReviewFallbackOpen(false)}>我知道了</Button>
        </div>
      </Modal>
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used inside ShopProvider');
  return context;
}
