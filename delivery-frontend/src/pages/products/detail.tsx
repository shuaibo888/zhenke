import {
  ArrowLeftOutlined,
  CloudOutlined,
  DownOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  RightOutlined,
  ShareAltOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Form, Input, Modal, Spin, Tag, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { AddressManager } from '@/components/AddressManager';
import { HomeFeedReportCard } from '@/components/HomeFeedReportCard';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  applyForTrial,
  fetchHomeFeed,
  fetchPublicProduct,
  toggleReportUseful,
  type HomeFeedItemDto,
  type PublicProductDto,
} from '@/services/shopContent';
import type { ShopShippingAddress } from '@/services/shopAuth';
import { buildProductShareLink, copyText, formatPrice } from '@/utils/shop';
import styles from '@/styles/commerce.less';

type PendingAddressAction = 'buy' | 'trial' | null;
const PRODUCT_REPORT_PAGE_SIZE = 6;

function formatAddress(address: ShopShippingAddress) {
  return `${address.region.join(' ')} ${address.detail}`.trim();
}

function trialTypeDescription(trialType: 'ONLINE' | 'OFFLINE') {
  return trialType === 'ONLINE'
    ? '审核通过后由商家发货，确认收货并完成体验后发布甄客验。'
    : '审核通过后直接参与线下体验，无需商家发货，体验完成后发布甄客验。';
}

const trialFlowSteps = [
  { label: '申请' },
  { label: '商家审核' },
  { label: '商家发货', note: '线下试用无需发货' },
  { label: '发布甄客验' },
];

export default function ProductDetailPage({ productId: productIdProp }: { productId?: number }) {
  const { productId: productIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    user,
    trials: myTrials,
    addresses,
    addToCart,
    buyNow,
    refreshTrials,
  } = useShop();
  const productId = productIdProp ?? Number(productIdParam);
  const campaignId = Number(searchParams.get('campaign'));
  const sourceReportId = Number(searchParams.get('sourceReport'));
  const validSourceReportId = Number.isSafeInteger(sourceReportId) && sourceReportId > 0 ? sourceReportId : undefined;
  const [product, setProduct] = useState<PublicProductDto | null>(null);
  const [feed, setFeed] = useState<HomeFeedItemDto[]>([]);
  const [reports, setReports] = useState<HomeFeedItemDto[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportPage, setReportPage] = useState(1);
  const [reportsLoadingMore, setReportsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trialChoiceOpen, setTrialChoiceOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialSubmitting, setTrialSubmitting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<HomeFeedItemDto | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [pendingAddressAction, setPendingAddressAction] = useState<PendingAddressAction>(null);
  const [buying, setBuying] = useState(false);
  const [cartSubmitting, setCartSubmitting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  const [form] = Form.useForm<{ applyReason: string }>();
  useBodyScrollLock(trialChoiceOpen || trialOpen || addressOpen || shareOpen);

  useEffect(() => {
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetchPublicProduct(productId),
      fetchHomeFeed({ productId, contentType: 'TRIAL', pageNum: 1, pageSize: 4 }),
      fetchHomeFeed({
        productId,
        contentType: 'REPORT',
        pageNum: 1,
        pageSize: PRODUCT_REPORT_PAGE_SIZE,
      }),
    ])
      .then(([nextProduct, trialResult, reportResult]) => {
        if (!mounted) return;
        setProduct(nextProduct);
        setFeed(trialResult.rows);
        setReports(reportResult.rows);
        setReportTotal(reportResult.total);
        setReportPage(1);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '商品加载失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [productId]);

  const campaigns = useMemo(() => feed.filter((item) => item.contentType === 'TRIAL' && item.trial), [feed]);
  const primaryCampaign = campaigns.find((item) => item.contentId === campaignId) ?? campaigns[0];
  const orderedCampaigns = useMemo(() => (
    primaryCampaign
      ? [primaryCampaign, ...campaigns.filter((item) => item.contentId !== primaryCampaign.contentId)]
      : campaigns
  ), [campaigns, primaryCampaign]);
  const supportsOnlineTrial = campaigns.some((item) => item.trial?.trialType === 'ONLINE');
  const supportsOfflineTrial = campaigns.some((item) => item.trial?.trialType === 'OFFLINE');
  const trialChoiceSummary = supportsOnlineTrial && supportsOfflineTrial
    ? '本商品提供线上和线下两种试用，请选择适合你的参与方式'
    : `本商品当前提供${supportsOnlineTrial ? '线上' : '线下'}试用，点击查看申请要求`;

  const requireLogin = () => {
    if (user) return true;
    message.info('请先登录');
    navigate('/auth');
    return false;
  };

  const addCart = async () => {
    if (!requireLogin() || !product) return;
    setCartSubmitting(true);
    try {
      await addToCart(product.productId, 1, validSourceReportId);
      message.success('已加入购物车');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加入购物车失败');
    } finally {
      setCartSubmitting(false);
    }
  };

  const submitBuy = async (address: ShopShippingAddress) => {
    if (!product) return;
    setBuying(true);
    try {
      await buyNow(address.id, product.productId, 1, validSourceReportId);
      message.success('订单已创建，请在付款期限内完成支付');
      navigate('/profile/orders');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单创建失败');
    } finally {
      setBuying(false);
      setAddressOpen(false);
      setPendingAddressAction(null);
    }
  };

  const startBuy = () => {
    if (!requireLogin()) return;
    const address = addresses.find((item) => item.isDefault) ?? addresses[0];
    if (address) {
      void submitBuy(address);
      return;
    }
    setPendingAddressAction('buy');
    setAddressOpen(true);
  };

  const startTrial = (campaign: HomeFeedItemDto) => {
    if (!requireLogin() || !campaign.trial) return;
    if (myTrials.some((item) => item.campaignId === campaign.contentId)) {
      message.info('你已经申请过本轮试用');
      return;
    }
    setSelectedCampaign(campaign);
    form.resetFields();
    setTrialOpen(true);
  };

  const chooseTrial = (campaign: HomeFeedItemDto) => {
    setTrialChoiceOpen(false);
    startTrial(campaign);
  };

  const submitTrial = async (values: { applyReason: string }, address?: ShopShippingAddress) => {
    if (!selectedCampaign?.trial) return;
    const online = selectedCampaign.trial.trialType === 'ONLINE';
    const shipping = address ?? addresses.find((item) => item.isDefault) ?? addresses[0];
    if (online && !shipping) {
      setPendingAddressAction('trial');
      setAddressOpen(true);
      return;
    }
    setTrialSubmitting(true);
    try {
      await applyForTrial(selectedCampaign.contentId, {
        applyReason: values.applyReason.trim(),
        recipientName: online ? shipping?.recipient : undefined,
        recipientPhone: online ? shipping?.phone : undefined,
        shippingAddress: online && shipping ? formatAddress(shipping) : undefined,
      });
      await refreshTrials();
      setTrialOpen(false);
      setSelectedCampaign(null);
      form.resetFields();
      message.success(online ? '申请已提交，可在“我的试用”查看进度' : '申请已提交，审核通过后即可发布甄客验');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试用申请提交失败');
    } finally {
      setTrialSubmitting(false);
      setAddressOpen(false);
      setPendingAddressAction(null);
    }
  };

  const useful = async (report: HomeFeedItemDto) => {
    if (!report.report) return;
    if (!requireLogin() || !user) return;
    if (report.report.shopUserId === user.id) {
      message.warning('不能给自己的甄客验点有用');
      return;
    }
    try {
      const result = await toggleReportUseful(report.contentId);
      setReports((items) => items.map((item) => (
        item.contentId === report.contentId && item.report
          ? { ...item, report: { ...item.report, ...result } }
          : item
      )));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const loadMoreReports = async () => {
    if (reportsLoadingMore || reports.length >= reportTotal) return;
    const nextPage = reportPage + 1;
    setReportsLoadingMore(true);
    try {
      const result = await fetchHomeFeed({
        productId,
        contentType: 'REPORT',
        pageNum: nextPage,
        pageSize: PRODUCT_REPORT_PAGE_SIZE,
      });
      setReports((current) => {
        const existing = new Set(current.map((item) => item.contentId));
        return [...current, ...result.rows.filter((item) => !existing.has(item.contentId))];
      });
      setReportTotal(result.total);
      setReportPage(nextPage);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更多甄客验加载失败');
    } finally {
      setReportsLoadingMore(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await copyText(buildProductShareLink(productId));
      message.success('商品链接已复制');
      setShareOpen(false);
    } catch {
      message.info(`可手动复制：${buildProductShareLink(productId)}`);
    }
  };

  if (loading) return <main className={styles.sessionLoading}><Spin size="large" /></main>;
  if (!product) {
    return <main className={styles.singleColumn}><p className={styles.empty}>商品不存在或已下架。</p></main>;
  }

  return (
    <>
      <main className={`${styles.journeyPage} ${styles.trialDetailPage} ${styles.productDetailMain}`}>
        <header className={styles.reportDetailBar}>
          <button type="button" className={styles.reportDetailBack} aria-label="返回" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined />
          </button>
          <span className={styles.trialDetailTitle}>{primaryCampaign ? '试用招募' : '商品详情'}</span>
          <button type="button" className={styles.reportDetailShare} aria-label="分享商品" onClick={() => setShareOpen(true)}>
            <ShareAltOutlined />
          </button>
        </header>

        <section className={styles.trialHero}>
          <div className={styles.trialHeroImage}><img src={product.coverUrl} alt={product.productName} /></div>
          <div className={styles.trialHeroBody}>
            <Tag color="green">{product.categoryName}</Tag>
            <h1>{product.productName}</h1>
            <p>{product.subtitle}</p>
            <strong className={styles.linkedProductPrice}>{formatPrice(product.price)}</strong>
          </div>
        </section>

        {campaigns.length > 0 && (
          <button
            type="button"
            className={styles.trialChoiceTrigger}
            onClick={() => setTrialChoiceOpen(true)}
          >
            <span className={styles.trialChoiceTriggerIcon}>试</span>
            <span className={styles.trialChoiceTriggerCopy}>
              <strong>申请试用</strong>
              <small>{trialChoiceSummary}</small>
            </span>
            <span className={styles.trialChoiceTriggerAction}>
              选择方式
              <RightOutlined />
            </span>
          </button>
        )}

        {campaigns.length > 0 && (
          <section className={styles.trialPanel}>
            <h2 className={styles.trialPanelTitle}>申请流程</h2>
            <ol className={styles.trialFlow}>
              {trialFlowSteps.map((step, index) => (
                  <li key={step.label}>
                    <span className={styles.trialFlowDot}>{index + 1}</span>
                    <span className={styles.trialFlowLabel}>{step.label}</span>
                    {step.note && <small className={styles.trialFlowNote}>{step.note}</small>}
                    {index < trialFlowSteps.length - 1 && <i className={styles.trialFlowArrow}>›</i>}
                  </li>
              ))}
            </ol>
          </section>
        )}

        <section className={styles.trialPanel}>
          <h2 className={styles.trialPanelTitle}>商品详情</h2>
          <p className={styles.productDetail}>{product.detail}</p>
        </section>

        {reportTotal > 0 && (
          <section className={styles.productReportFlow}>
            <button
              type="button"
              className={styles.productReportsHeader}
              onClick={() => setShowAllReports(!showAllReports)}
            >
              <div className={styles.sectionHeader}>
                <div><span className={styles.eyebrow}>真实体验参考</span><h2>先看这件商品的甄客验</h2></div>
                <span>{reportTotal} 份真实评价</span>
              </div>
              <DownOutlined className={`${styles.productReportsArrow} ${showAllReports ? styles.productReportsArrowOpen : ''}`} />
            </button>
            {showAllReports && (
              <div className={styles.productReportsList}>
                {reports.map((report) => (
                  <HomeFeedReportCard
                    key={report.contentId}
                    item={report}
                    variant="preview"
                    onOpen={() => navigate(`/reports/${report.contentId}`)}
                    onUseful={() => void useful(report)}
                  />
                ))}
                {reports.length < reportTotal && (
                  <Button block loading={reportsLoadingMore} onClick={() => void loadMoreReports()}>
                    加载更多甄客验
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        <div className={`${styles.reportDetailBottomBar} ${styles.productFixedBar}`}>
          <Button
            size="large"
            className={styles.trialBuyGhost}
            icon={<ShoppingCartOutlined />}
            loading={cartSubmitting}
            onClick={() => void addCart()}
          >
            加入购物车
          </Button>
          <Button type="primary" size="large" className={styles.reportDetailBuy} loading={buying} onClick={startBuy}>
            立即购买
          </Button>
        </div>
      </main>

      <Modal
        title="选择试用方式"
        open={trialChoiceOpen}
        onCancel={() => setTrialChoiceOpen(false)}
        footer={null}
        width={520}
        centered
        rootClassName={`${styles.trialChoiceModal} ${styles.responsiveModal}`}
      >
        <p className={styles.trialChoiceHint}>请选择适合你的试用方式，确认后再填写申请信息。</p>
        <div className={styles.trialChoiceList}>
          {orderedCampaigns.map((campaign) => {
            if (!campaign.trial) return null;
            const online = campaign.trial.trialType === 'ONLINE';
            const applied = myTrials.some((item) => item.campaignId === campaign.contentId);
            const full = campaign.trial.approvedCount >= campaign.trial.targetCount;
            const remaining = Math.max(0, campaign.trial.targetCount - campaign.trial.approvedCount);
            return (
              <button
                type="button"
                className={styles.trialChoiceOption}
                key={campaign.contentId}
                disabled={applied || full}
                onClick={() => chooseTrial(campaign)}
              >
                <span className={`${styles.trialChoiceOptionIcon} ${online ? styles.online : styles.offline}`}>
                  {online ? <CloudOutlined /> : <EnvironmentOutlined />}
                </span>
                <span className={styles.trialChoiceOptionCopy}>
                  <strong>{online ? '线上试用' : '线下试用'}</strong>
                  <small>{trialTypeDescription(campaign.trial.trialType)}</small>
                  <em>剩余 {remaining} 个名额 · 截止 {campaign.trial.applicationDeadline.slice(0, 10)}</em>
                </span>
                <span className={styles.trialChoiceOptionState}>
                  {applied ? '已申请' : full ? '名额已满' : '选择'}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        title={selectedCampaign?.trial?.trialType === 'ONLINE' ? '申请线上试用' : '申请线下试用'}
        open={trialOpen}
        onCancel={() => setTrialOpen(false)}
        footer={null}
        rootClassName={styles.responsiveModal}
      >
        <Form form={form} layout="vertical" onFinish={(values) => void submitTrial(values)}>
          <Form.Item
            name="applyReason"
            label="申请理由"
            rules={[{ required: true, message: '请填写申请理由' }, { max: 1000 }]}
          >
            <Input.TextArea rows={5} maxLength={1000} showCount />
          </Form.Item>
          <Button block type="primary" size="large" htmlType="submit" loading={trialSubmitting}>提交申请</Button>
        </Form>
      </Modal>

      <AddressManager
        open={addressOpen}
        picker
        onClose={() => setAddressOpen(false)}
        onSelect={(address) => {
          if (pendingAddressAction === 'buy') void submitBuy(address);
          if (pendingAddressAction === 'trial') {
            void form.validateFields().then((values) => submitTrial(values, address));
          }
        }}
      />
      <Drawer
        title="分享商品"
        placement="bottom"
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        height="auto"
        rootClassName={styles.responsiveDrawer}
      >
        <div className={styles.shareSheet}>
          <div className={styles.sharePreview}>
            <img src={product.coverUrl} alt={product.productName} />
            <div className={styles.sharePreviewText}>
              <strong>{product.productName}</strong>
              <p>{product.subtitle || product.detail.slice(0, 40)}</p>
            </div>
          </div>
          <div className={styles.shareLinkBox}>
            <LinkOutlined />
            <span className={styles.shareLinkText}>{buildProductShareLink(productId)}</span>
          </div>
          <Button
            block
            type="primary"
            size="large"
            icon={<LinkOutlined />}
            className={styles.shareCopyButton}
            onClick={() => void copyShareLink()}
          >
            复制链接
          </Button>
          <Button block size="large" className={styles.shareCancel} onClick={() => setShareOpen(false)}>取消</Button>
        </div>
      </Drawer>
    </>
  );
}
