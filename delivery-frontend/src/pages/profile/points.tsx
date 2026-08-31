import { CheckCircleFilled, HistoryOutlined, SwapOutlined, TrophyOutlined } from '@ant-design/icons';
import { Button, InputNumber, Modal, Spin, message } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { LoginRedirect } from '@/components/LoginRedirect';
import { ZkProfilePage, ZkProfilePanel, ZkTaskHeader } from '@/components/ZkPage';
import { useRefreshOnRoute } from '@/hooks/useRefreshOnRoute';
import {
  exchangePointCoupon,
  fetchPointCouponOptions,
  fetchPointTransferBalance,
  fetchPointTransferSources,
  submitPointTransfer,
  type ShopPointCouponOption,
  type ShopPointTransferSource,
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
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSources, setTransferSources] = useState<ShopPointTransferSource[]>([]);
  const [transferSourcesLoading, setTransferSourcesLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>();
  const [availablePoints, setAvailablePoints] = useState<number>();
  const [transferPoints, setTransferPoints] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const balanceQuerySequence = useRef(0);

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

  const queryTransferBalance = useCallback(async (sourceSystem: string) => {
    const querySequence = ++balanceQuerySequence.current;
    setAvailablePoints(undefined);
    setTransferPoints(null);
    setBalanceLoading(true);
    try {
      const balance = await fetchPointTransferBalance(sourceSystem);
      if (querySequence === balanceQuerySequence.current) {
        setAvailablePoints(balance.availablePoints);
      }
    } finally {
      if (querySequence === balanceQuerySequence.current) {
        setBalanceLoading(false);
      }
    }
  }, []);

  const openTransfer = useCallback(async () => {
    setTransferOpen(true);
    setTransferSources([]);
    setSelectedSource(undefined);
    setAvailablePoints(undefined);
    setTransferPoints(null);
    setTransferSourcesLoading(true);
    try {
      const sources = await fetchPointTransferSources();
      setTransferSources(sources);
      const first = sources[0];
      if (first) {
        setSelectedSource(first.sourceSystem);
        void queryTransferBalance(first.sourceSystem).catch((error) => {
          message.error(error instanceof Error ? error.message : '可划拨余额查询失败');
        });
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '积分来源加载失败');
    } finally {
      setTransferSourcesLoading(false);
    }
  }, [queryTransferBalance]);

  const selectTransferSource = useCallback(async (sourceSystem: string) => {
    setSelectedSource(sourceSystem);
    setAvailablePoints(undefined);
    setTransferPoints(null);
    try {
      await queryTransferBalance(sourceSystem);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '可划拨积分查询失败');
    }
  }, [queryTransferBalance]);

  const closeTransfer = useCallback(() => {
    if (transferring) return;
    balanceQuerySequence.current += 1;
    setBalanceLoading(false);
    setTransferOpen(false);
  }, [transferring]);

  const fillAllPoints = useCallback(() => {
    if (availablePoints !== undefined) setTransferPoints(availablePoints);
  }, [availablePoints]);

  const confirmTransfer = useCallback(async () => {
    if (!selectedSource || availablePoints === undefined || transferPoints == null
      || transferPoints <= 0 || transferPoints > availablePoints) return;
    setTransferring(true);
    try {
      const result = await submitPointTransfer(selectedSource, transferPoints);
      message.success(`已成功划入 ${result.transferredPoints} 积分`);
      await refreshPoints();
      setTransferOpen(false);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '积分划拨失败';
      message.error(reason);
      if (!reason.includes('确认中') && selectedSource) {
        void queryTransferBalance(selectedSource).catch(() => undefined);
      }
    } finally {
      setTransferring(false);
    }
  }, [selectedSource, availablePoints, transferPoints, refreshPoints, queryTransferBalance]);

  if (!user) {
    return <LoginRedirect />;
  }

  const selectedTransferSource = transferSources.find((source) => source.sourceSystem === selectedSource);
  const sourceUnitName = selectedTransferSource?.sourceUnitName || '余额';
  const transferPointsValid = transferPoints != null && transferPoints > 0
    && availablePoints !== undefined && transferPoints <= availablePoints;

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
    <ZkProfilePage className={styles.pointsPage}>
        <ZkTaskHeader eyebrow="权益资产" title="积分中心" description="查看可用积分、来源划拨、兑换权益和每一笔变化记录。" backTo="/profile" />
      <section className={styles.pointBalancePanel}>
        <span className={styles.pointBalanceIcon}><TrophyOutlined /></span>
        <div className={styles.pointCurrentBalance}>
          <span>当前积分</span>
          <strong>{pointsLoading ? '--' : points.balance}</strong>
          <small>可用积分余额</small>
        </div>
        <div className={styles.pointPanelActions}>
          <Button
            className={styles.pointTransferLink}
            icon={<SwapOutlined />}
            onClick={() => { void openTransfer(); }}
          >
            划拨
          </Button>
          <Button
            className={styles.pointRecordsLink}
            icon={<HistoryOutlined />}
            onClick={() => navigate('/profile/point-records')}
          >
            积分明细
          </Button>
        </div>
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

      <Modal
        open={transferOpen}
        title="积分划拨"
        className={styles.responsiveModal}
        onCancel={closeTransfer}
        footer={null}
        centered
        width={500}
        mask={{ closable: !transferring }}
        closable={!transferring}
      >
        <div className={styles.pointTransferForm}>
          <div className={styles.pointTransferIntro}>
            <strong>选择来源系统</strong>
            <span>将其他系统账户中的余额划入甄客行积分</span>
          </div>
          <Spin spinning={transferSourcesLoading}>
            <div className={`${styles.pointTransferSourceGrid} ${
              transferSources.length > 1 ? styles.pointTransferSourceGridMultiple : ''
            }`}>
              {transferSources.map((source) => {
                const selected = source.sourceSystem === selectedSource;
                return (
                  <button
                    type="button"
                    key={source.sourceSystem}
                    className={`${styles.pointTransferSourceCard} ${selected ? styles.pointTransferSourceCardSelected : ''}`}
                    aria-pressed={selected}
                    disabled={transferring}
                    onClick={() => { void selectTransferSource(source.sourceSystem); }}
                  >
                    <span className={styles.pointTransferSourceCover}>
                      <span className={styles.pointTransferSourceFallback}>{source.sourceName}</span>
                      <img
                        src={source.coverUrl}
                        alt={`${source.sourceName}封面`}
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                    </span>
                    <span className={styles.pointTransferSourceInfo}>
                      <span className={styles.pointTransferSourceTitle}>
                        <strong>{source.sourceName}</strong>
                        {selected ? <CheckCircleFilled /> : null}
                      </span>
                      <small>{source.sourceUnitName}划入甄客行积分</small>
                    </span>
                  </button>
                );
              })}
              {!transferSourcesLoading && transferSources.length === 0 ? (
                <div className={styles.pointTransferSourceEmpty}>暂无可用的来源系统</div>
              ) : null}
            </div>
          </Spin>
          {selectedTransferSource ? (
            <>
              <div className={styles.pointTransferBalance}>
                <span>{selectedTransferSource.sourceName}可划拨{sourceUnitName}</span>
                <strong>{balanceLoading ? '查询中…' : availablePoints === undefined ? '--' : availablePoints.toLocaleString()}</strong>
              </div>
              <label className={styles.pointTransferField}>
                <span>本次划拨{sourceUnitName}</span>
                <div className={styles.pointTransferInputRow}>
                  <InputNumber
                    min={1}
                    max={availablePoints}
                    precision={0}
                    value={transferPoints}
                    onChange={(value) => setTransferPoints(value)}
                    disabled={balanceLoading || availablePoints === undefined || availablePoints === 0 || transferring}
                    placeholder={`请输入${sourceUnitName}数量`}
                    style={{ flex: 1 }}
                  />
                  <Button
                    onClick={fillAllPoints}
                    disabled={balanceLoading || availablePoints === undefined || availablePoints === 0 || transferring}
                  >
                    全部划拨
                  </Button>
                </div>
              </label>
              <div className={styles.pointTransferPreview}>
                <span>预计划入甄客行积分</span>
                <strong>{transferPointsValid ? transferPoints.toLocaleString() : '--'}</strong>
              </div>
              <p className={styles.pointTransferHint}>
                划拨成功后，{selectedTransferSource.sourceName}扣除对应{sourceUnitName}，商城增加积分。
              </p>
            </>
          ) : null}
          <div className={styles.pointTransferActions}>
            <Button onClick={closeTransfer} disabled={transferring}>取消</Button>
            <Button
              type="primary"
              onClick={() => { void confirmTransfer(); }}
              loading={transferring}
              disabled={balanceLoading || availablePoints === undefined || availablePoints === 0 || !transferPointsValid}
            >
              确认划拨
            </Button>
          </div>
        </div>
      </Modal>

      <ZkProfilePanel title="可兑换优惠券" meta={`共 ${coupons.length} 张`}>

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
              <strong>暂无可兑换优惠券</strong>
              <p>管理员上架全平台积分券后，会在这里展示。</p>
            </div>
          )}
        </Spin>
      </ZkProfilePanel>
    </ZkProfilePage>
  );
}
