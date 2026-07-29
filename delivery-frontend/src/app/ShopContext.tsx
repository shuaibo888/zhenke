import { message } from 'antd';
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
  fetchShopCaptcha,
  fetchShopShippingAddresses,
  loginShopUser,
  logoutShopUser,
  registerShopUser,
  restoreShopSession,
  setDefaultShopShippingAddress,
  updateShopShippingAddress,
  type CaptchaState,
  type ShopShippingAddress,
  type ShopShippingAddressBody,
} from '@/services/shopAuth';
import type { AuthUser } from '@/utils/authRules';
import { clearWechatPaymentQuery, invokeWechatJsapi } from '@/utils/wechatPayment';

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
  orders: ShopOrderDto[];
  ordersLoading: boolean;
  trials: TrialApplicationDto[];
  reports: VerificationReportDto[];
  addresses: ShopShippingAddress[];
  privateLoading: boolean;
  payingOrderId: number | null;
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
  refreshPrivateData: () => Promise<void>;
  addToCart: (productId: number, quantity?: number, sourceReportId?: number) => Promise<void>;
  changeCartQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  removeCartItem: (cartItemId: number) => Promise<void>;
  checkoutCart: (addressId: number, userCouponId?: number) => Promise<ShopOrderDto[]>;
  buyNow: (addressId: number, productId: number, quantity?: number, sourceReportId?: number, userCouponId?: number) => Promise<ShopOrderDto[]>;
  payOrder: (orderId: number, authorization?: { code?: string; state?: string }) => Promise<void>;
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
  const [orders, setOrders] = useState<ShopOrderDto[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [trials, setTrials] = useState<TrialApplicationDto[]>([]);
  const [reports, setReports] = useState<VerificationReportDto[]>([]);
  const [addresses, setAddresses] = useState<ShopShippingAddress[]>([]);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const paymentReturnHandled = useRef(false);

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

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart([]);
      return;
    }
    setCartLoading(true);
    try {
      setCart(await fetchShopCart());
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  const refreshOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      setOrders(await fetchShopOrders());
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  const refreshCoupons = useCallback(async () => {
    setCoupons(user ? await fetchMyCoupons() : []);
  }, [user]);

  const refreshTrials = useCallback(async () => {
    setTrials(user ? await fetchMyTrialApplications() : []);
  }, [user]);

  const refreshReports = useCallback(async () => {
    setReports(user ? await fetchMyVerificationReports() : []);
  }, [user]);

  const refreshAddresses = useCallback(async () => {
    setAddresses(user ? await fetchShopShippingAddresses() : []);
  }, [user]);

  const refreshPrivateData = useCallback(async () => {
    if (!user) {
      setCart([]);
      setCoupons([]);
      setOrders([]);
      setTrials([]);
      setReports([]);
      setAddresses([]);
      return;
    }
    setPrivateLoading(true);
    setCartLoading(true);
    setOrdersLoading(true);
    try {
      const [nextCart, nextOrders, nextTrials, nextReports, nextAddresses, nextCoupons] = await Promise.all([
        fetchShopCart(),
        fetchShopOrders(),
        fetchMyTrialApplications(),
        fetchMyVerificationReports(),
        fetchShopShippingAddresses(),
        fetchMyCoupons(),
      ]);
      setCart(nextCart);
      setOrders(nextOrders);
      setTrials(nextTrials);
      setReports(nextReports);
      setAddresses(nextAddresses);
      setCoupons(nextCoupons);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '个人数据加载失败');
    } finally {
      setCartLoading(false);
      setOrdersLoading(false);
      setPrivateLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshPrivateData();
  }, [refreshPrivateData]);

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

  const logout = useCallback(async () => {
    try {
      await logoutShopUser();
    } finally {
      setUser(null);
      setCart([]);
      setCoupons([]);
      setOrders([]);
      setTrials([]);
      setReports([]);
      setAddresses([]);
    }
  }, []);

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

  const checkoutCart = useCallback(async (addressId: number, userCouponId?: number) => {
    const created = await checkoutShopCart(addressId, userCouponId);
    setCart([]);
    setOrders((items) => [...created, ...items]);
    if (userCouponId) void fetchMyCoupons().then(setCoupons).catch(() => undefined);
    return created;
  }, []);

  const buyNow = useCallback(async (
    addressId: number,
    productId: number,
    quantity = 1,
    sourceReportId?: number,
    userCouponId?: number,
  ) => {
    const created = await createShopOrders({
      addressId,
      items: [{ productId, quantity, sourceReportId }],
      userCouponId,
    });
    setOrders((items) => [...created, ...items]);
    if (userCouponId) void fetchMyCoupons().then(setCoupons).catch(() => undefined);
    return created;
  }, []);

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
      message.error(error instanceof Error ? error.message : '微信支付失败');
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
    orders,
    ordersLoading,
    trials,
    reports,
    addresses,
    privateLoading,
    payingOrderId,
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
    refreshPrivateData,
    addToCart,
    changeCartQuantity,
    removeCartItem,
    checkoutCart,
    buyNow,
    payOrder,
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
    cart, cartLoading, coupons, orders, ordersLoading, trials, reports, addresses, privateLoading, payingOrderId,
    loadCaptcha, login, register, logout, refreshCart, refreshCoupons, refreshOrders, refreshTrials,
    refreshReports, refreshAddresses, refreshPrivateData, addToCart, changeCartQuantity,
    removeCartItem, checkoutCart, buyNow, payOrder, saveAddress, makeDefaultAddress, removeAddress,
  ]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used inside ShopProvider');
  return context;
}
