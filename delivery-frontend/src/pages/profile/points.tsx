import { GiftOutlined, HistoryOutlined, TrophyOutlined } from '@ant-design/icons';
import { Button, Modal, Spin, message } from 'antd';
import { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import {
  exchangePointCoupon,
  fetchPointCouponOptions,
  type ShopPointCouponOption,
} from '@/services/shopAuth';
import { formatPrice } from '@/utils/shop';
import styles from '@/styles/commerce.less';

function formatDate(value: string) {
  return value?.replace('T', ' ').slice(0, 10);
}

export default function PointsPage() {
  const navigate = useNavigate();
  const { user, points, pointsLoading, refreshPoints, refreshCoupons } = useShop();
  const [coupons, setCoupons] = useState<ShopPointCouponOption[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [exchangingId, setExchangingId] = useState<number>();

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      setCoupons(await fetchPointCouponOptions());
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  const refreshPage = useCallback(async () => {
    await Promise.all([refreshPoints(), loadCoupons()]);
  }, [loadCoupons, refreshPoints]);

  useRefreshOnRoute('/profile/points', refreshPage, '积分兑换信息刷新失败');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const confirmExchange = (coupon: ShopPointCouponOption) => {
    if (coupon.exchanged || coupon.remainingStock <= 0 || exchangingId) return;
    if (points.balance < coupon.pointsCost) {
      message.warning('当前积分不足，暂时无法兑换');
      return;
    }
    Modal.confirm({
      title: `兑换${coupon.couponName}`,
      content: `本次将扣除 ${coupon.pointsCost} 积分，兑换成功后优惠券会放入“我的优惠券”。`,
      okText: '确认兑换',
      cancelText: '再想想',
      onOk: async () => {
        setExchangingId(coupon.couponId);
        try {
          await exchangePointCoupon(coupon.couponId);
          await Promise.all([refreshPoints(), refreshCoupons(), loadCoupons()]);
          message.success('兑换成功，优惠券已放入“我的优惠券”');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '优惠券兑换失败');
          throw error;
        } finally {
          setExchangingId(undefined);
        }
      },
    });
  };

  return (
    <main className={`${styles.profileDetailPage} ${styles.pointsPage}`}>
      <section className={styles.pointBalancePanel}>
        <span className={styles.pointBalanceIcon}><TrophyOutlined /></span>
        <div className={styles.pointCurrentBalance}>
          <span>当前积分</span>
          <strong>{pointsLoading ? '--' : points.balance}</strong>
          <small>可用积分余额</small>
        </div>
        <Button
          className={styles.pointRecordsLink}
          icon={<HistoryOutlined />}
          onClick={() => navigate('/profile/point-records')}
        >
          积分明细
        </Button>
        <div className={styles.pointSummaryStats}>
          <div>
            <span>累计划入</span>
            <strong>{pointsLoading ? '--' : points.totalTransferredIn}</strong>
          </div>
          <div>
            <span>累计消费</span>
            <strong>{pointsLoading ? '--' : points.totalConsumed}</strong>
          </div>
        </div>
      </section>

      <section className={styles.orderPanel}>
        <div className={styles.orderPanelHeading}>
          <div>
            <span className={styles.eyebrow}>积分兑换</span>
            <h3>全平台通用优惠券</h3>
          </div>
          <span>共 {coupons.length} 张</span>
        </div>

        <Spin spinning={couponsLoading}>
          <div className={styles.pointCouponGrid}>
            {coupons.map((coupon) => {
              const insufficient = points.balance < coupon.pointsCost;
              const soldOut = coupon.remainingStock <= 0;
              const disabled = coupon.exchanged || soldOut || insufficient;
              const buttonText = coupon.exchanged
                ? '已兑换'
                : soldOut
                  ? '已兑完'
                  : insufficient
                    ? '积分不足'
                    : `${coupon.pointsCost} 积分兑换`;
              return (
                <article className={styles.pointCouponCard} key={coupon.couponId}>
                  <div className={styles.pointCouponAmount}>
                    <span>{formatPrice(coupon.discountAmount)}</span>
                    <small>{coupon.minimumSpend > 0 ? `满 ${formatPrice(coupon.minimumSpend)} 可用` : '无门槛优惠'}</small>
                  </div>
                  <div className={styles.pointCouponBody}>
                    <div>
                      <strong>{coupon.couponName}</strong>
                      <span>全平台通用</span>
                    </div>
                    <p>{coupon.description || '平台精选积分兑换优惠券'}</p>
                    <small>{formatDate(coupon.startTime)} 至 {formatDate(coupon.endTime)}</small>
                    <small>剩余 {coupon.remainingStock} 张</small>
                    <Button
                      type="primary"
                      disabled={disabled}
                      loading={exchangingId === coupon.couponId}
                      onClick={() => confirmExchange(coupon)}
                    >
                      {buttonText}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {!couponsLoading && coupons.length === 0 && (
            <div className={styles.pointCouponEmpty}>
              <GiftOutlined />
              <strong>暂无可兑换优惠券</strong>
              <p>管理员上架全平台积分券后，会在这里展示。</p>
            </div>
          )}
        </Spin>
      </section>
    </main>
  );
}
