import {
  EnvironmentOutlined,
  PhoneOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Button, QRCode, Result, Spin, Tag, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkProfilePage, ZkTaskHeader } from '@/components/ZkPage';
import {
  fetchMyCoupon,
  fetchPublicMerchant,
  type ShopCouponDto,
} from '@/services/shopContent';
import { openMerchantNavigation } from '@/utils/merchantNavigation';
import { formatPrice } from '@/utils/shop';
import styles from '@/styles/commerce.less';

const statusMeta: Record<ShopCouponDto['availabilityStatus'], { label: string; color: string }> = {
  AVAILABLE: { label: '可使用', color: 'green' },
  PENDING: { label: '待生效', color: 'blue' },
  USED: { label: '已使用', color: 'default' },
  EXPIRED: { label: '已过期', color: 'default' },
  DISABLED: { label: '已下架', color: 'red' },
};

export default function CouponDetailPage() {
  const { user, refreshCoupons } = useShop();
  const navigate = useNavigate();
  const params = useParams<{ userCouponId: string }>();
  const userCouponId = Number(params.userCouponId);
  const [coupon, setCoupon] = useState<ShopCouponDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadCoupon = useCallback(async (quiet = false) => {
    if (!Number.isSafeInteger(userCouponId) || userCouponId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!quiet) {
      setLoading(true);
      setLoadError('');
    }
    try {
      const next = await fetchMyCoupon(userCouponId);
      setCoupon(next);
      setNotFound(false);
      if (next.status === 'USED') void refreshCoupons().catch(() => undefined);
    } catch (error) {
      if (!quiet) {
        const reason = error instanceof Error ? error.message : '优惠券详情加载失败';
        setLoadError(reason);
        message.error(reason);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [refreshCoupons, userCouponId]);

  useEffect(() => { void loadCoupon(); }, [loadCoupon]);
  useEffect(() => {
    if (!coupon || coupon.availabilityStatus !== 'AVAILABLE' || coupon.usageMode === 'ORDER') return undefined;
    const timer = window.setInterval(() => void loadCoupon(true), 3000);
    return () => window.clearInterval(timer);
  }, [coupon?.availabilityStatus, coupon?.usageMode, loadCoupon]);

  if (!user) return <LoginRedirect />;
  if (loading) return <ZkProfilePage className={styles.couponDetailPage}><Spin size="large" /></ZkProfilePage>;
  if (loadError && !coupon) {
    return (
      <ZkProfilePage className={styles.couponDetailPage}>
        <Result
          status="error"
          title="优惠券详情暂时无法加载"
          subTitle={loadError}
          extra={[
            <Button type="primary" key="retry" onClick={() => void loadCoupon()}>重新加载</Button>,
            <Button key="back" onClick={() => navigate('/profile/coupons')}>返回我的优惠券</Button>,
          ]}
        />
      </ZkProfilePage>
    );
  }
  if (notFound || !coupon) {
    return <ZkProfilePage className={styles.couponDetailPage}><Result status="404" title="优惠券不存在" extra={<Button onClick={() => navigate('/profile/coupons')}>返回我的优惠券</Button>} /></ZkProfilePage>;
  }

  const meta = statusMeta[coupon.availabilityStatus];
  const canOfflineRedeem = coupon.availabilityStatus === 'AVAILABLE' && coupon.usageMode !== 'ORDER';

  const navigateMerchant = async (merchantId: number) => {
    try {
      const merchant = await fetchPublicMerchant(merchantId);
      await openMerchantNavigation(merchant);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '暂时无法发起导航');
    }
  };

  return (
    <ZkProfilePage className={styles.couponDetailPage}>
        <ZkTaskHeader eyebrow="权益资产" title="优惠券详情" description="核对适用商家、使用条件和有效期。" backTo="/profile/coupons" />
      <section className={styles.couponDetailHero}>
        <Tag color={meta.color}>{meta.label}</Tag>
        <strong>{formatPrice(coupon.discountAmount)}</strong>
        <h1>{coupon.couponName}</h1>
        <p>{coupon.minimumSpend > 0 ? `满 ${formatPrice(coupon.minimumSpend)} 可用` : '无门槛优惠'}</p>
      </section>

      {canOfflineRedeem && (
        <section className={styles.couponCodePanel}>
          <h2>到店核销码</h2>
          <p>到店后出示此固定核销码，商家核对信息后确认核销。</p>
          <QRCode value={coupon.couponCode} size={228} />
          <code>{coupon.couponCode}</code>
        </section>
      )}

      <section className={styles.couponDetailPanel}>
        <h2>使用说明</h2>
        <dl>
          <div><dt>使用方式</dt><dd>{coupon.usageMode === 'ORDER' ? '商城下单' : coupon.usageMode === 'OFFLINE' ? '到店核销' : '商城下单或到店核销'}</dd></div>
          <div><dt>有效期</dt><dd>{coupon.startTime} 至 {coupon.endTime}</dd></div>
          <div><dt>说明</dt><dd>{coupon.redeemInstructions || coupon.description || '请在有效期内使用'}</dd></div>
          {coupon.availabilityStatus === 'USED' && <div><dt>使用时间</dt><dd>{coupon.usedTime || '-'}</dd></div>}
          {coupon.redeemedMerchantName && <div><dt>核销门店</dt><dd>{coupon.redeemedMerchantName}</dd></div>}
          {coupon.consumptionAmount != null && <div><dt>消费金额</dt><dd>{formatPrice(coupon.consumptionAmount)}</dd></div>}
          {coupon.actualAmount != null && <div><dt>优惠后金额</dt><dd>{formatPrice(coupon.actualAmount)}</dd></div>}
        </dl>
      </section>

      {coupon.merchants.length > 0 && (
        <section className={styles.couponDetailPanel}>
          <h2>适用门店</h2>
          <div className={styles.couponMerchantList}>
            {coupon.merchants.map((merchant) => (
              <article key={merchant.merchantId}>
                <button type="button" onClick={() => navigate(`/merchants/${merchant.merchantId}`)}>
                  <ShopOutlined />
                  <span><strong>{merchant.merchantName}</strong><small>{merchant.storeAddress || '查看商家详情'}</small></span>
                </button>
                <div>
                  {merchant.contactPhone && <Button icon={<PhoneOutlined />} href={`tel:${merchant.contactPhone}`}>电话</Button>}
                  <Button type="primary" icon={<EnvironmentOutlined />} disabled={merchant.latitude == null || merchant.longitude == null} onClick={() => void navigateMerchant(merchant.merchantId)}>导航</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </ZkProfilePage>
  );
}
