import { GiftOutlined } from '@ant-design/icons';
import { Spin, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { ZkTaskHeader } from '@/components/ZkPage';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import type { ShopCouponDto } from '@/services/shopContent';
import { formatPrice } from '@/utils/shop';
import styles from '@/styles/commerce.less';

type CouponFilter = 'all' | 'AVAILABLE' | 'PENDING' | 'USED' | 'INVALID';

const availabilityMeta: Record<ShopCouponDto['availabilityStatus'], {
  label: string;
  color: string;
}> = {
  AVAILABLE: { label: '可使用', color: 'green' },
  PENDING: { label: '待生效', color: 'blue' },
  USED: { label: '已使用', color: 'default' },
  EXPIRED: { label: '已过期', color: 'default' },
  DISABLED: { label: '已下架', color: 'red' },
};

function formatDate(value: string) {
  return value?.replace('T', ' ').slice(0, 19);
}

export default function CouponsPage() {
  const { user, coupons, couponsLoading, refreshCoupons } = useShop();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CouponFilter>('all');
  useRefreshOnRoute('/profile/coupons', refreshCoupons, '优惠券刷新失败');

  const filtered = useMemo(() => coupons.filter((coupon) => {
    if (filter === 'all') return true;
    if (filter === 'INVALID') return ['EXPIRED', 'DISABLED'].includes(coupon.availabilityStatus);
    return coupon.availabilityStatus === filter;
  }), [coupons, filter]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <main className={`${styles.profileDetailPage} ${styles.couponsPage}`}>
        <ZkTaskHeader eyebrow="权益资产" title="我的优惠券" description="集中查看下单券、到店核销券及其有效状态。" backTo="/profile" />
      <section className={styles.orderPanel}>
        <div className={styles.orderPanelHeading}>
          <div>
            <span className={styles.eyebrow}>优惠权益</span>
            <h3>我的优惠券</h3>
          </div>
          <span>共 {filtered.length} 张</span>
        </div>
        <div className={styles.orderFilterTabs}>
          {([
            ['all', '全部'],
            ['AVAILABLE', '可使用'],
            ['PENDING', '待生效'],
            ['USED', '已使用'],
            ['INVALID', '已失效'],
          ] as Array<[CouponFilter, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? styles.orderFilterActive : ''}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <Spin spinning={couponsLoading}>
          <div className={styles.couponWalletList}>
            {filtered.map((coupon) => {
              const meta = availabilityMeta[coupon.availabilityStatus];
              const merchantNames = coupon.merchants.map((merchant) => merchant.merchantName).join('、');
              const inactive = coupon.availabilityStatus !== 'AVAILABLE';
              return (
                <article
                  className={`${styles.couponWalletCard} ${inactive ? styles.couponWalletCardInactive : ''}`}
                  key={coupon.userCouponId}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/profile/coupons/${coupon.userCouponId}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') navigate(`/profile/coupons/${coupon.userCouponId}`);
                  }}
                >
                  <div className={styles.couponWalletAmount}>
                    <span>{formatPrice(coupon.discountAmount)}</span>
                    <small>{coupon.minimumSpend > 0 ? `满 ${formatPrice(coupon.minimumSpend)} 可用` : '无门槛优惠'}</small>
                  </div>
                  <div className={styles.couponWalletBody}>
                    <div className={styles.couponWalletTitle}>
                      <strong>{coupon.couponName}</strong>
                      <Tag color={meta.color}>{meta.label}</Tag>
                    </div>
                    <p>{coupon.description || '平台定向优惠券'}</p>
                    <p>{coupon.usageMode === 'ORDER' ? '商城下单使用' : coupon.usageMode === 'OFFLINE' ? '到店出示核销码' : '商城下单或到店核销'}</p>
                    <dl>
                      <div>
                        <dt>适用范围</dt>
                        <dd>{coupon.scopeType === 'PLATFORM_WIDE' ? '全平台通用' : (merchantNames || '暂无可用商家')}</dd>
                      </div>
                      <div>
                        <dt>有效期</dt>
                        <dd className={styles.couponWalletValidity}>
                          <span>{formatDate(coupon.startTime)} 至</span>
                          <span>{formatDate(coupon.endTime)}</span>
                        </dd>
                      </div>
                      <div><dt>券码</dt><dd>{coupon.couponCode}</dd></div>
                    </dl>
                  </div>
                  <GiftOutlined className={styles.couponWalletWatermark} />
                </article>
              );
            })}
          </div>
          {!couponsLoading && filtered.length === 0 && (
            <div className={styles.couponWalletEmpty}>
              <GiftOutlined />
              <strong>暂无此类优惠券</strong>
              <p>平台下发后会自动出现在这里，无需手动领取。</p>
            </div>
          )}
        </Spin>
      </section>
    </main>
  );
}
