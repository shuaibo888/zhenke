import {
  EnvironmentOutlined,
  GiftOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { Alert, Button, Checkbox, Drawer, Modal, Space, Spin, Tag, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { AddressManager } from '@/components/AddressManager';
import { CheckoutJourney } from '@/components/CheckoutJourney';
import { ProfileBackButton } from '@/components/ProfileBackButton';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useSafeBack } from '@/hooks/useSafeBack';
import {
  fetchAvailableCoupons,
  fetchPublicProduct,
  fetchShopOrder,
  type PublicProductDto,
  type ShopCouponDto,
  type ShopOrderDto,
} from '@/services/shopContent';
import type { ShopShippingAddress } from '@/services/shopAuth';
import { formatPrice } from '@/utils/shop';
import styles from '@/styles/commerce.less';

type CheckoutLine = {
  productId: number;
  sourceReportId?: number;
  merchantId: number;
  merchantName: string;
  productName: string;
  coverUrl: string;
  price: number;
  quantity: number;
  categoryCode?: string;
  supportsOnline?: '0' | '1';
  supportsOffline?: '0' | '1';
  stock?: number;
  stockUnlimited?: '0' | '1';
  productStatus?: 'DRAFT' | 'ON_SALE' | 'OFF_SALE';
};

const minimumWechatPayment = 0.01;
const localLifeCategoryCodes = new Set(['ZHENKE_HOTEL', 'ZHENKE_RESTAURANT', 'ZHENKE_SCENIC']);

function cartLineFulfillment(line: CheckoutLine): 'ONLINE' | 'OFFLINE' {
  if (line.categoryCode && localLifeCategoryCodes.has(line.categoryCode)) return 'OFFLINE';
  return line.supportsOnline === '0' && line.supportsOffline === '1' ? 'OFFLINE' : 'ONLINE';
}

function isLocalLifeLine(line: CheckoutLine) {
  return Boolean(line.categoryCode && localLifeCategoryCodes.has(line.categoryCode));
}

function checkoutGroupKey(line: CheckoutLine, fulfillment = cartLineFulfillment(line)) {
  return `${line.merchantId}:${fulfillment}:${isLocalLifeLine(line) ? line.productId : 'shared'}`;
}

function addressText(address: ShopShippingAddress) {
  return `${address.region.join(' ')} ${address.detail}`.trim();
}

function couponValidity(coupon: ShopCouponDto) {
  return `${coupon.startTime.slice(0, 10)} 至 ${coupon.endTime.slice(0, 10)}`;
}

function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/mall');
  const [searchParams] = useSearchParams();
  const {
    user,
    cart,
    cartLoading,
    coupons,
    couponsLoading: myCouponsLoading,
    orders,
    addresses,
    addressesLoading,
    refreshCart,
    refreshCoupons,
    refreshAddresses,
    checkoutCart,
    buyNow,
    payOrder,
    payingOrderId,
  } = useShop();
  const orderIdValue = Number(searchParams.get('orderId'));
  const orderId = Number.isSafeInteger(orderIdValue) && orderIdValue > 0 ? orderIdValue : undefined;
  const orderMode = Boolean(orderId);
  const contextPaymentOrder = orders.find((order) => order.orderId === orderId);
  const source = searchParams.get('source') === 'cart' ? 'cart' : 'buy';
  const productId = Number(searchParams.get('productId'));
  const quantityValue = Number(searchParams.get('quantity') || 1);
  const quantity = Number.isInteger(quantityValue) && quantityValue > 0 && quantityValue <= 99 ? quantityValue : 1;
  const sourceReportValue = Number(searchParams.get('sourceReportId'));
  const sourceReportId = Number.isSafeInteger(sourceReportValue) && sourceReportValue > 0
    ? sourceReportValue
    : undefined;
  const [product, setProduct] = useState<PublicProductDto | null>(null);
  const [loadedPaymentOrder, setLoadedPaymentOrder] = useState<ShopOrderDto | null>(null);
  const [orderLoading, setOrderLoading] = useState(orderMode);
  const [orderLoadError, setOrderLoadError] = useState('');
  const [productLoading, setProductLoading] = useState(!orderMode && source === 'buy');
  const [checkoutRefreshError, setCheckoutRefreshError] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<ShopCouponDto[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [selectedCouponIds, setSelectedCouponIds] = useState<number[]>([]);
  const [draftCouponIds, setDraftCouponIds] = useState<number[]>([]);
  const [couponOpen, setCouponOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>();
  const [addressOpen, setAddressOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFulfillmentType, setSelectedFulfillmentType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const paymentOrder = loadedPaymentOrder ?? contextPaymentOrder ?? undefined;
  useBodyScrollLock(addressOpen || couponOpen);

  useEffect(() => {
    if (!user || orderMode) return;
    setCheckoutRefreshError('');
    const requests = [refreshAddresses(), refreshCoupons()];
    if (source === 'cart') requests.push(refreshCart());
    void Promise.all(requests).catch((error) => {
      const reason = error instanceof Error ? error.message : '结算信息刷新失败';
      setCheckoutRefreshError(reason);
      message.error(reason);
    });
  }, [orderMode, refreshAddresses, refreshCart, refreshCoupons, source, user]);

  useEffect(() => {
    if (!orderMode || !orderId || !user) {
      setOrderLoading(false);
      setLoadedPaymentOrder(null);
      setOrderLoadError('');
      return;
    }
    let mounted = true;
    setOrderLoading(true);
    setOrderLoadError('');
    setLoadedPaymentOrder(null);
    fetchShopOrder(orderId)
      .then((order) => {
        if (mounted) setLoadedPaymentOrder(order);
      })
      .catch((error) => {
        if (mounted) {
          const reason = error instanceof Error ? error.message : '订单加载失败';
          setOrderLoadError(reason);
          message.error(reason);
        }
      })
      .finally(() => {
        if (mounted) setOrderLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId, orderMode, user]);

  useEffect(() => {
    if (orderMode || source !== 'buy') {
      setProductLoading(false);
      return;
    }
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setProduct(null);
      message.error({ key: 'checkout-product-load', content: '商品编号无效' });
      setProductLoading(false);
      return;
    }
    let mounted = true;
    setProductLoading(true);
    setProduct(null);
    fetchPublicProduct(productId)
      .then((nextProduct) => {
        if (mounted) setProduct(nextProduct);
      })
      .catch((error) => {
        if (mounted) {
          const reason = error instanceof Error ? error.message : '商品加载失败';
          message.error({ key: 'checkout-product-load', content: reason });
        }
      })
      .finally(() => {
        if (mounted) setProductLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderMode, productId, source]);

  useEffect(() => {
    if (selectedAddressId && addresses.some((address) => address.id === selectedAddressId)) return;
    const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
    setSelectedAddressId(preferred?.id);
  }, [addresses, selectedAddressId]);

  const buySupportsOnline = product?.supportsOnline === '1';
  const buySupportsOffline = product?.supportsOffline === '1';
  useEffect(() => {
    if (orderMode || source !== 'buy' || !product) return;
    setSelectedFulfillmentType(buySupportsOnline ? 'ONLINE' : 'OFFLINE');
  }, [buySupportsOnline, buySupportsOffline, orderMode, product, source]);

  const lines = useMemo<CheckoutLine[]>(() => {
    if (paymentOrder) {
      return paymentOrder.items.map((item) => ({
        productId: item.productId,
        sourceReportId: item.sourceReportId,
        merchantId: paymentOrder.merchantId,
        merchantName: paymentOrder.merchantName,
        productName: item.productName,
        coverUrl: item.coverUrl,
        price: item.unitPrice,
        quantity: item.quantity,
      }));
    }
    if (source === 'cart') {
      return cart.map((item) => ({
        productId: item.productId,
        sourceReportId: item.sourceReportId,
        merchantId: item.merchantId,
        merchantName: item.merchantName,
        productName: item.productName,
        coverUrl: item.coverUrl,
        price: item.price,
        quantity: item.quantity,
        categoryCode: item.categoryCode,
        supportsOnline: item.supportsOnline,
        supportsOffline: item.supportsOffline,
        stock: item.stock,
        stockUnlimited: item.stockUnlimited,
        productStatus: item.productStatus,
      }));
    }
    return product ? [{
      productId: product.productId,
      sourceReportId,
      merchantId: product.merchantId,
      merchantName: product.merchantName,
      productName: product.productName,
      coverUrl: product.coverUrl,
      price: product.price,
      quantity,
      categoryCode: product.categoryCode,
      supportsOnline: product.supportsOnline,
      supportsOffline: product.supportsOffline,
    }] : [];
  }, [cart, paymentOrder, product, quantity, source, sourceReportId]);

  const merchants = useMemo(
    () => Array.from(new Map(lines.map((line) => [line.merchantId, line.merchantName])).entries()),
    [lines],
  );
  const checkoutGroups = useMemo(() => {
    const grouped = new Map<string, CheckoutLine[]>();
    lines.forEach((line) => {
      const fulfillment = source === 'cart' ? cartLineFulfillment(line) : selectedFulfillmentType;
      const key = checkoutGroupKey(line, fulfillment);
      grouped.set(key, [...(grouped.get(key) ?? []), line]);
    });
    return Array.from(grouped.values()).map((groupLines) => ({
      key: checkoutGroupKey(
        groupLines[0],
        source === 'cart' ? cartLineFulfillment(groupLines[0]) : selectedFulfillmentType,
      ),
      merchantName: groupLines[0].merchantName || '甄客行',
      fulfillment: source === 'cart' ? cartLineFulfillment(groupLines[0]) : selectedFulfillmentType,
      localLife: isLocalLifeLine(groupLines[0]),
      lines: groupLines,
      amount: groupLines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    }));
  }, [lines, selectedFulfillmentType, source]);
  const subtotal = paymentOrder?.originalAmount
    ?? lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const cartHasOffline = source === 'cart'
    && lines.some((line) => cartLineFulfillment(line) === 'OFFLINE');
  const cartHasOnline = source === 'cart'
    && lines.some((line) => cartLineFulfillment(line) === 'ONLINE');
  const mixedCartFulfillment = source === 'cart' && cartHasOnline && cartHasOffline;
  const cartHasUnavailableItems = source === 'cart' && lines.some((line) => (
    line.productStatus !== 'ON_SALE'
      || (line.stockUnlimited !== '1' && (line.stock ?? 0) < line.quantity)
  ));
  const buyStockInsufficient = source === 'buy'
    && Boolean(product)
    && product?.stockUnlimited !== '1'
    && (product?.stock ?? 0) < quantity;
  const singleCheckoutGroup = checkoutGroups.length === 1;
  const selectedCoupons = selectedCouponIds
    .map((couponId) => availableCoupons.find((coupon) => coupon.userCouponId === couponId))
    .filter((coupon): coupon is ShopCouponDto => Boolean(coupon));
  const selectedCouponFaceAmount = selectedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0);
  const maximumCouponDiscount = subtotal > minimumWechatPayment
    ? toMoney(subtotal - minimumWechatPayment)
    : 0;
  const discount = paymentOrder?.discountAmount
    ?? (singleCheckoutGroup ? Math.min(maximumCouponDiscount, toMoney(selectedCouponFaceAmount)) : 0);
  const payable = paymentOrder?.totalAmount
    ?? (subtotal > 0 ? Math.max(minimumWechatPayment, toMoney(subtotal - discount)) : 0);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const checkoutFulfillment = orderMode
    ? paymentOrder?.fulfillmentType ?? 'ONLINE'
    : mixedCartFulfillment
      ? 'MIXED'
      : source === 'cart' && cartHasOffline
        ? 'OFFLINE'
        : selectedFulfillmentType;
  const needsAddress = orderMode
    ? paymentOrder?.fulfillmentType === 'ONLINE'
    : source === 'cart'
      ? cartHasOnline
      : selectedFulfillmentType === 'ONLINE';
  const couponUnavailableReason = useMemo(() => {
    if (checkoutGroups.length > 1) return '本次将生成多笔独立订单，暂不能使用优惠券';
    if (!singleCheckoutGroup || subtotal <= 0) return '暂无可结算商品';
    if (coupons.length === 0) return '暂无优惠券';
    const unused = coupons.filter((coupon) => coupon.status === 'UNUSED');
    if (unused.length === 0) return '暂无未使用的优惠券';
    const merchantId = merchants[0][0];
    const applicable = unused.filter((coupon) => (
      coupon.scopeType === 'PLATFORM_WIDE'
      || coupon.merchants.some((merchant) => merchant.merchantId === merchantId)
    ));
    if (applicable.length === 0) return '现有优惠券不适用于当前商家';
    const now = Date.now();
    const enabled = applicable.filter((coupon) => coupon.couponStatus === 'ENABLED');
    if (enabled.length === 0) return '适用优惠券当前已下架';
    const started = enabled.filter((coupon) => new Date(coupon.startTime).getTime() <= now);
    if (started.length === 0) return '适用优惠券尚未生效';
    const unexpired = started.filter((coupon) => new Date(coupon.endTime).getTime() > now);
    if (unexpired.length === 0) return '适用优惠券已过期';
    if (unexpired.every((coupon) => coupon.minimumSpend > subtotal)) {
      return '当前商品金额未达到优惠券使用条件';
    }
    return '当前订单暂无可用优惠券';
  }, [checkoutGroups.length, coupons, merchants, singleCheckoutGroup, subtotal]);

  useEffect(() => {
    if (orderMode || !user || !singleCheckoutGroup || subtotal <= 0) {
      setAvailableCoupons([]);
      setSelectedCouponIds([]);
      setDraftCouponIds([]);
      setCouponsLoading(false);
      return;
    }
    let mounted = true;
    setCouponsLoading(true);
    setAvailableCoupons([]);
    setSelectedCouponIds([]);
    setDraftCouponIds([]);
    fetchAvailableCoupons(merchants[0][0], subtotal)
      .then((coupons) => {
        if (!mounted) return;
        setAvailableCoupons(coupons);
        setSelectedCouponIds((current) => current.filter((couponId) => (
          coupons.some((coupon) => coupon.userCouponId === couponId)
        )));
      })
      .catch((error) => {
        if (mounted) {
          const reason = error instanceof Error ? error.message : '可用优惠券加载失败';
          message.error(reason);
        }
      })
      .finally(() => {
        if (mounted) setCouponsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [merchants, orderMode, singleCheckoutGroup, subtotal, user]);

  if (!user) {
    return <LoginRedirect />;
  }

  const pageLoading = productLoading || orderLoading
    || (!orderMode && (myCouponsLoading || (needsAddress && addressesLoading)))
    || (!orderMode && source === 'cart' && cartLoading);
  const showCheckoutContent = orderMode ? Boolean(paymentOrder) && !orderLoadError : lines.length > 0;

  const draftCoupons = draftCouponIds
    .map((couponId) => availableCoupons.find((coupon) => coupon.userCouponId === couponId))
    .filter((coupon): coupon is ShopCouponDto => Boolean(coupon));
  const draftFaceAmount = toMoney(draftCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0));
  const draftDiscount = Math.min(maximumCouponDiscount, draftFaceAmount);
  const draftPayable = subtotal > 0
    ? Math.max(minimumWechatPayment, toMoney(subtotal - draftDiscount))
    : 0;

  const toggleDraftCoupon = (coupon: ShopCouponDto, checked: boolean) => {
    if (!checked) {
      setDraftCouponIds((current) => current.filter((couponId) => couponId !== coupon.userCouponId));
      return;
    }
    const currentFaceAmount = toMoney(draftCoupons.reduce((sum, item) => sum + item.discountAmount, 0));
    const currentDiscount = Math.min(maximumCouponDiscount, currentFaceAmount);
    const currentPayable = Math.max(minimumWechatPayment, toMoney(subtotal - currentDiscount));
    const remainingDiscountCapacity = Math.max(0, toMoney(currentPayable - minimumWechatPayment));
    if (remainingDiscountCapacity <= 0) {
      message.warning('本单优惠已达上限，最低仍需微信支付 0.01 元');
      return;
    }
    const appliedAmount = Math.min(coupon.discountAmount, remainingDiscountCapacity);
    const nextCouponIds = [...draftCouponIds, coupon.userCouponId];
    if (toMoney(currentPayable - appliedAmount) <= minimumWechatPayment) {
      Modal.confirm({
        title: '最低仍需支付 0.01 元',
        content: (
          <div>
            <p>这张券面额为 {formatPrice(coupon.discountAmount)}，本单将实际抵扣 {formatPrice(appliedAmount)}。</p>
            <p>优惠后仍需微信支付 0.01 元；提交订单后该优惠券会正常核销。</p>
          </div>
        ),
        okText: '确认使用',
        cancelText: '暂不使用',
        centered: true,
        onOk: () => setDraftCouponIds(nextCouponIds),
      });
      return;
    }
    setDraftCouponIds(nextCouponIds);
  };

  const confirmCouponSelection = () => {
    setSelectedCouponIds(draftCouponIds);
    setCouponOpen(false);
  };

  const submit = async () => {
    if (orderMode) {
      if (!paymentOrder) {
        message.warning('订单不存在或尚未加载完成');
        return;
      }
      if (paymentOrder.status !== 'PENDING_PAYMENT') {
        message.info(paymentOrder.status === 'PAID' ? '订单已经支付完成' : '当前订单不能继续支付');
        return;
      }
      await payOrder(paymentOrder.orderId);
      return;
    }
    if (needsAddress && !selectedAddress) {
      setAddressOpen(true);
      message.info('请先选择收货地址');
      return;
    }
    if (lines.length === 0) {
      message.warning(source === 'cart' ? '购物车为空' : '商品不存在或已下架');
      return;
    }
    if (cartHasUnavailableItems) {
      message.warning('购物车包含已下架或库存不足的商品，请返回购物车处理后再结算');
      return;
    }
    if (buyStockInsufficient) {
      message.warning('当前购买数量超过可售库存，请返回商品页调整数量');
      return;
    }
    const addressId = needsAddress ? (selectedAddress?.id ?? null) : null;
    setSubmitting(true);
    try {
      const created = source === 'cart'
        ? await checkoutCart(addressId, singleCheckoutGroup ? selectedCouponIds : undefined)
        : await buyNow(addressId, productId, quantity, sourceReportId, selectedCouponIds, selectedFulfillmentType);
      if (created.length === 1) {
        const createdOrder = created[0];
        navigate(`/checkout?orderId=${createdOrder.orderId}`);
        if (createdOrder.status === 'PAID') {
          message.success('订单已支付完成');
          return;
        }
        message.success(createdOrder.discountAmount > 0
          ? `优惠 ${formatPrice(createdOrder.discountAmount)}，订单已创建`
          : '订单已创建');
        await payOrder(createdOrder.orderId);
        return;
      }
      message.success(`已生成 ${created.length} 笔独立订单，请在订单列表分别支付`);
      navigate('/profile/orders');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main className={`${styles.profileDetailPage} ${styles.checkoutPage}`}>
        <div className={styles.profileDetailToolbar}>
          <ProfileBackButton onClick={goBack} />
          <span>确认商品、地址与优惠信息后提交支付</span>
        </div>
        <header className={styles.checkoutHeader}>
          <div>
            <span className={styles.eyebrow}>安全结算</span>
            <h1>{orderMode ? '订单支付' : '确认支付'}</h1>
            <p>{orderMode ? '微信授权或页面刷新后，仍会回到当前订单继续支付。' : '确认商品、地址与优惠信息后提交订单并完成支付。'}</p>
          </div>
          <SafetyCertificateOutlined />
        </header>
        <CheckoutJourney
          fulfillmentType={checkoutFulfillment}
          paymentOnly={orderMode}
        />

        <Spin spinning={pageLoading}>
          {!orderMode && source === 'cart' && !pageLoading && lines.length === 0 && !checkoutRefreshError && (
            <Alert
              className={styles.checkoutOrderState}
              type="info"
              showIcon
              message="购物车还是空的"
              description="请先从商城、酒店、景区或饭店选择需要购买的商品。"
              action={<Button onClick={() => navigate('/mall')}>去逛逛</Button>}
            />
          )}
          {!orderMode && cartHasUnavailableItems && (
            <Alert
              className={styles.checkoutOrderState}
              type="warning"
              showIcon
              message="购物车包含不可结算商品"
              description="部分商品已下架或库存不足，请返回商城打开购物车移除商品或调整数量。"
              action={<Button onClick={() => navigate('/mall')}>返回商城</Button>}
            />
          )}
          {!orderMode && buyStockInsufficient && (
            <Alert
              className={styles.checkoutOrderState}
              type="warning"
              showIcon
              message="商品库存不足"
              description={`当前仅剩 ${product?.stock ?? 0} 件，请返回商品页调整购买数量。`}
              action={<Button onClick={() => navigate(`/products/${productId}`)}>返回商品</Button>}
            />
          )}
          {paymentOrder && paymentOrder.status !== 'PENDING_PAYMENT' && (
            <Alert
              className={styles.checkoutOrderState}
              type={paymentOrder.status === 'PAID' ? 'success' : 'info'}
              showIcon
              message={paymentOrder.status === 'PAID' ? '支付已完成' : '当前订单无需继续支付'}
              description={paymentOrder.status === 'PAID'
                ? paymentOrder.fulfillmentType === 'OFFLINE'
                  ? '支付结果已经确认，可前往订单详情查看核销码。'
                  : '支付结果已经确认，可前往我的订单查看发货进度。'
                : '订单状态已经变化，请前往我的订单查看详情。'}
              action={<Button onClick={() => navigate('/profile/orders')}>查看订单</Button>}
            />
          )}
          {showCheckoutContent && <div className={styles.checkoutLayout}>
            <div className={styles.checkoutMain}>
              {!orderMode && (source === 'cart' || product) && (
              <section className={styles.checkoutSection}>
                <div className={styles.checkoutSectionTitle}>
                  <span>{source === 'cart' ? <TruckOutlined /> : selectedFulfillmentType === 'ONLINE' ? <TruckOutlined /> : <ShopOutlined />}</span>
                  <div>
                    <strong>履约方式</strong>
                    <small>{source === 'cart' ? `本次预计生成 ${checkoutGroups.length} 笔独立订单` : '请确认本次购买的收货方式'}</small>
                  </div>
                </div>
                {source === 'cart' ? (
                  <div className={`${styles.checkoutFulfillmentOption} ${styles.checkoutFulfillmentOptionActive} ${styles.checkoutFulfillmentOptionFixed}`}>
                    <span className={styles.checkoutFulfillmentIcon}>{cartHasOffline && !cartHasOnline ? <ShopOutlined /> : <TruckOutlined />}</span>
                    <span className={styles.checkoutFulfillmentCopy}>
                      <strong>{cartHasOffline && cartHasOnline ? '配送 + 到店核销' : cartHasOffline ? '到店核销' : '快递物流'}</strong>
                      <small>{cartHasOffline && cartHasOnline
                        ? '配送与到店服务分别成单；每种本地生活服务拥有独立核销码'
                        : cartHasOffline
                          ? '每种酒店、景区或饭店服务独立成单并生成核销码'
                          : '商品将配送至你选择的收货地址'}</small>
                    </span>
                    <Tag color="green">已固定</Tag>
                  </div>
                ) : (
                  <div className={styles.checkoutFulfillmentOptions}>
                    {buySupportsOnline && (
                      <button
                        type="button"
                        className={`${styles.checkoutFulfillmentOption} ${selectedFulfillmentType === 'ONLINE' ? styles.checkoutFulfillmentOptionActive : ''}`}
                        onClick={() => setSelectedFulfillmentType('ONLINE')}
                      >
                        <span className={styles.checkoutFulfillmentIcon}><TruckOutlined /></span>
                        <span className={styles.checkoutFulfillmentCopy}>
                          <strong>快递物流</strong>
                          <small>默认选择，填写地址后送货上门</small>
                        </span>
                        <span className={styles.checkoutFulfillmentCheck}>{selectedFulfillmentType === 'ONLINE' ? '已选择' : '选择'}</span>
                      </button>
                    )}
                    {buySupportsOffline && (
                      <button
                        type="button"
                        className={`${styles.checkoutFulfillmentOption} ${selectedFulfillmentType === 'OFFLINE' ? styles.checkoutFulfillmentOptionActive : ''}`}
                        onClick={() => setSelectedFulfillmentType('OFFLINE')}
                      >
                        <span className={styles.checkoutFulfillmentIcon}><ShopOutlined /></span>
                        <span className={styles.checkoutFulfillmentCopy}>
                          <strong>线下核销</strong>
                          <small>无需地址，支付后到店出示核销码</small>
                        </span>
                        <span className={styles.checkoutFulfillmentCheck}>{selectedFulfillmentType === 'OFFLINE' ? '已选择' : '选择'}</span>
                      </button>
                    )}
                  </div>
                )}
              </section>
              )}

              {!orderMode && checkoutGroups.length > 0 && (
                <section className={styles.checkoutSection}>
                  <div className={styles.checkoutSectionTitle}>
                    <span><SafetyCertificateOutlined /></span>
                    <div>
                      <strong>订单拆分确认</strong>
                      <small>提交后生成 {checkoutGroups.length} 笔订单，分别支付、退款和履约</small>
                    </div>
                  </div>
                  <div className={styles.checkoutOrderPlan}>
                    {checkoutGroups.map((group, index) => (
                      <div className={styles.checkoutOrderPlanItem} key={group.key}>
                        <span className={styles.checkoutOrderPlanIndex}>{index + 1}</span>
                        <span className={styles.checkoutOrderPlanCopy}>
                          <strong>{group.merchantName}</strong>
                          <small>
                            {group.localLife
                              ? `${group.lines[0].productName} · 独立核销码`
                              : group.fulfillment === 'ONLINE'
                                ? `快递配送 · ${group.lines.length} 种商品`
                                : `到店核销 · ${group.lines.length} 种商品`}
                          </small>
                        </span>
                        <span className={styles.checkoutOrderPlanAmount}>{formatPrice(group.amount)}</span>
                      </div>
                    ))}
                  </div>
                  {checkoutGroups.length > 1 && (
                    <Alert
                      className={styles.checkoutSplitNotice}
                      type="info"
                      showIcon
                      message="多笔订单需分别完成支付"
                      description="部分订单支付成功不会影响其他订单；未支付订单可稍后继续支付或等待自动关闭。"
                    />
                  )}
                </section>
              )}
              {needsAddress ? (
              <section className={styles.checkoutSection}>
                <div className={styles.checkoutSectionTitle}>
                  <span><EnvironmentOutlined /></span>
                  <div><strong>收货地址</strong><small>商品将配送至此地址</small></div>
                </div>
                <button
                  type="button"
                  className={styles.checkoutAddress}
                  disabled={orderMode}
                  onClick={() => !orderMode && setAddressOpen(true)}
                >
                  {paymentOrder?.address ? (
                    <span>
                      <strong>{paymentOrder.address.recipient}　{paymentOrder.address.phone}</strong>
                      <small>
                        {paymentOrder.address.provinceCode} {paymentOrder.address.cityCode}
                        {' '}{paymentOrder.address.districtCode} {paymentOrder.address.detail}
                      </small>
                    </span>
                  ) : selectedAddress ? (
                    <span>
                      <strong>{selectedAddress.recipient}　{selectedAddress.phone}</strong>
                      <small>{addressText(selectedAddress)}</small>
                    </span>
                  ) : (
                    <span><strong>请选择收货地址</strong><small>还没有可用的收货地址</small></span>
                  )}
                  {!orderMode && <RightOutlined />}
                </button>
              </section>
              ) : (
              <section className={styles.checkoutSection}>
                <div className={styles.checkoutSectionTitle}>
                  <span><ShopOutlined /></span>
                  <div><strong>到店核销</strong><small>支付后到店出示核销码，商家核销后完成</small></div>
                </div>
                <div className={styles.checkoutCouponTrigger}>
                  <span className={styles.checkoutCouponTriggerCopy}>
                    <strong>无需收货地址</strong>
                    <small>下单支付后生成核销券，到店扫码核销</small>
                  </span>
                </div>
              </section>
              )}

              <section className={styles.checkoutSection}>
                <div className={styles.checkoutSectionTitle}>
                  <span><ShopOutlined /></span>
                  <div><strong>商品信息</strong><small>{merchants.length || 0} 个商家 · {lines.length} 种商品</small></div>
                </div>
                <div className={styles.checkoutMerchantList}>
                  {merchants.map(([merchantId, merchantName]) => (
                    <div className={styles.checkoutMerchant} key={merchantId}>
                      <div className={styles.checkoutMerchantName}>
                        <ShopOutlined />
                        <strong>{merchantName || '甄客行'}</strong>
                      </div>
                      {lines.filter((line) => line.merchantId === merchantId).map((line) => (
                        <article className={styles.checkoutProduct} key={`${line.productId}-${line.sourceReportId || 0}`}>
                          <img src={line.coverUrl} alt={line.productName} />
                          <div>
                            <strong>{line.productName}</strong>
                            <small>数量 × {line.quantity}</small>
                          </div>
                          <span>{formatPrice(line.price * line.quantity)}</span>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.checkoutSection}>
                <div className={styles.checkoutSectionTitle}>
                  <span><GiftOutlined /></span>
                  <div><strong>优惠券</strong><small>支持多张叠加，商家券与平台通用券可混合使用</small></div>
                </div>
                {orderMode ? (
                  <div className={styles.checkoutCouponTrigger}>
                    <span className={styles.checkoutCouponTriggerIcon}><GiftOutlined /></span>
                    <span className={styles.checkoutCouponTriggerCopy}>
                      <strong>{discount > 0 ? `本单已优惠 ${formatPrice(discount)}` : '本订单未使用优惠券'}</strong>
                      <small>订单提交后不能更换或补用优惠券</small>
                    </span>
                  </div>
                ) : !singleCheckoutGroup && lines.length > 0 && (
                  <Alert
                    className={styles.checkoutCouponAlert}
                    type="warning"
                    showIcon
                    message="多笔独立订单暂不能使用优惠券"
                    description="本次仍可按原价结算；系统会按上方明细生成独立订单。"
                  />
                )}
                {!orderMode && <button
                  type="button"
                  className={styles.checkoutCouponTrigger}
                  disabled={couponsLoading || availableCoupons.length === 0 || !singleCheckoutGroup}
                  onClick={() => {
                    setDraftCouponIds(selectedCouponIds);
                    setCouponOpen(true);
                  }}
                >
                  <span className={styles.checkoutCouponTriggerIcon}><GiftOutlined /></span>
                  <span className={styles.checkoutCouponTriggerCopy}>
                    {selectedCoupons.length > 0 ? (
                      <>
                        <strong>已选择 {selectedCoupons.length} 张优惠券</strong>
                        <small>本单优惠 {formatPrice(discount)}，预计实付 {formatPrice(payable)}</small>
                      </>
                    ) : availableCoupons.length > 0 ? (
                      <>
                        <strong>有 {availableCoupons.length} 张可用优惠券</strong>
                        <small>可多选叠加，最低仍需微信支付 0.01 元</small>
                      </>
                    ) : (
                      <>
                        <strong>{couponsLoading ? '正在查询可用优惠券' : couponUnavailableReason}</strong>
                        <small>平台通用券无门槛，商家券按各自使用条件生效</small>
                      </>
                    )}
                  </span>
                  {availableCoupons.length > 0 && singleCheckoutGroup && <RightOutlined />}
                </button>}
              </section>
            </div>

            <aside className={styles.checkoutSummaryPanel}>
              <h2>订单金额</h2>
              <dl>
                <div><dt>商品合计</dt><dd>{formatPrice(subtotal)}</dd></div>
                <div><dt>优惠券</dt><dd className={discount > 0 ? styles.checkoutDiscount : ''}>
                  {discount > 0 ? `-${formatPrice(discount)}` : formatPrice(0)}
                </dd></div>
                <div>
                  <dt>{checkoutFulfillment === 'MIXED' ? '配送/服务费' : checkoutFulfillment === 'OFFLINE' ? '服务费' : '配送费'}</dt>
                  <dd>{checkoutFulfillment === 'MIXED' ? `免运费 / ${formatPrice(0)}` : checkoutFulfillment === 'OFFLINE' ? formatPrice(0) : '免运费'}</dd>
                </div>
              </dl>
              <div className={styles.checkoutPayable}>
                <span>应付金额</span>
                <strong>{formatPrice(payable)}</strong>
              </div>
              <Button
                block
                type="primary"
                size="large"
                loading={submitting || payingOrderId === orderId}
                disabled={pageLoading || lines.length === 0
                  || cartHasUnavailableItems
                  || buyStockInsufficient
                  || (orderMode && paymentOrder?.status !== 'PENDING_PAYMENT')}
                onClick={() => void submit()}
              >
                {orderMode
                  ? paymentOrder?.status === 'PENDING_PAYMENT' ? '立即支付' : '无需支付'
                  : !singleCheckoutGroup ? `确认生成 ${checkoutGroups.length} 笔订单` : '提交订单并支付'}
              </Button>
              <p>{orderMode ? '微信授权返回后会继续停留在本支付页面。' : '提交即表示确认商品、地址和优惠信息。'}</p>
            </aside>
          </div>}
        </Spin>
      </main>
      <AddressManager
        open={!orderMode && addressOpen}
        picker
        onClose={() => setAddressOpen(false)}
        onSelect={(address) => {
          setSelectedAddressId(address.id);
          setAddressOpen(false);
        }}
      />
      <Drawer
        title="选择优惠券"
        placement="bottom"
        size="min(78dvh, 660px)"
        open={couponOpen}
        onClose={confirmCouponSelection}
        rootClassName={`${styles.checkoutCouponDrawer} ${styles.responsiveDrawer}`}
        footer={(
          <Button
            block
            type="primary"
            size="large"
            onClick={confirmCouponSelection}
          >
            确认选择{draftCouponIds.length > 0 ? `（${draftCouponIds.length} 张）` : ''}
          </Button>
        )}
      >
        <div className={styles.checkoutCouponPreview}>
          <span>已选 {draftCouponIds.length} 张，预计优惠 {formatPrice(draftDiscount)}</span>
          <strong>预计实付 {formatPrice(draftPayable)}</strong>
          {draftCouponIds.length > 0 && (
            <Button type="link" onClick={() => setDraftCouponIds([])}>清空选择</Button>
          )}
        </div>
        <div className={styles.checkoutCouponList}>
          {availableCoupons.map((coupon) => (
            <Checkbox
              className={styles.checkoutCouponOption}
              checked={draftCouponIds.includes(coupon.userCouponId)}
              onChange={(event) => toggleDraftCoupon(coupon, event.target.checked)}
              key={coupon.userCouponId}
            >
              <span className={styles.checkoutCouponValue}>{formatPrice(coupon.discountAmount)}</span>
              <span className={styles.checkoutCouponCopy}>
                <strong>{coupon.couponName}</strong>
                <small>
                  {coupon.minimumSpend > 0 ? `满 ${formatPrice(coupon.minimumSpend)} 可用` : '无门槛'}
                  {' · '}{couponValidity(coupon)}
                </small>
              </span>
              <Tag color="green">可用</Tag>
            </Checkbox>
          ))}
        </div>
      </Drawer>
    </>
  );
}
