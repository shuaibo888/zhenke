import {
  ArrowLeftOutlined,
  CloudOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  LinkOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Form, Input, Modal, Spin, Tag, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
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

type PendingAddressAction = 'trial' | null;
const PRODUCT_REPORT_PAGE_SIZE = 5;

function formatAddress(address: ShopShippingAddress) {
  return `${address.region.join(' ')} ${address.detail}`.trim();
}

function trialTypeDescription(trialType: 'ONLINE' | 'OFFLINE') {
  return trialType === 'ONLINE'
    ? '审核通过后由商家发货，确认收货并完成体验后发布甄客验。'
    : '审核通过后到店出示核销码，商家扫码核销后即可参与线下体验，体验完成后发布甄客验。';
}

const trialFlowSteps = [
  { label: '申请' },
  { label: '商家审核' },
  { label: '商家发货', note: '线上试用审核通过后商家发货' },
  { label: '发布甄客验' },
];

const offlineTrialFlowSteps = [
  { label: '申请' },
  { label: '商家审核' },
  { label: '商家核销', note: '到店出示核销码' },
  { label: '发布甄客验' },
];

const certificationSourceLabels: Record<string, string> = {
  BRAND_DIRECT: '品牌方直接供货',
  DISTRIBUTOR: '经销商或供应商供货',
  OWN_BRAND: '自有品牌或自有生产',
  OTHER: '其他来源',
};

const certificationMatchLabels: Record<string, string> = {
  MODEL_OR_ITEM_NO: '包装上的型号或货号',
  BARCODE: '包装条形码',
  PRODUCT_NAME: '材料中的商品名称',
  PACKAGE_LABEL: '包装标签',
};

const certificationProofLabels: Record<string, string> = {
  BRAND_AUTHORIZATION: '品牌授权书',
  PURCHASE_CONTRACT: '采购合同',
  PURCHASE_INVOICE_OR_ORDER: '采购发票或订单',
  DELIVERY_OR_WAREHOUSE_RECEIPT: '送货单或入库单',
  OWN_PRODUCTION: '自有生产证明',
  OTHER: '其他供货材料',
};

export default function ProductDetailPage({ productId: productIdProp }: { productId?: number }) {
  const { productId: productIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    user,
    trials: myTrials,
    addresses,
    addToCart,
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
  const [reportLoadFailed, setReportLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trialChoiceOpen, setTrialChoiceOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialSubmitting, setTrialSubmitting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<HomeFeedItemDto | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [pendingAddressAction, setPendingAddressAction] = useState<PendingAddressAction>(null);
  const [cartSubmitting, setCartSubmitting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [productContentTab, setProductContentTab] = useState<'DETAIL' | 'REPORT'>('DETAIL');
  const [activeProductImage, setActiveProductImage] = useState('');
  const [carouselResetKey, setCarouselResetKey] = useState(0);
  const carouselTouchStartX = useRef<number | null>(null);
  const reportLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const reportLoadRequestRef = useRef<Promise<void> | null>(null);
  const reportProductIdRef = useRef(productId);
  reportProductIdRef.current = productId;
  const [form] = Form.useForm<{ applyReason: string }>();
  useBodyScrollLock(trialChoiceOpen || trialOpen || addressOpen || shareOpen);

  useEffect(() => {
    if (!user) return;
    void refreshTrials().catch(() => undefined);
  }, [productId, refreshTrials, user]);

  useEffect(() => {
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setProductContentTab('DETAIL');
    reportLoadRequestRef.current = null;
    setReportsLoadingMore(false);
    setReportLoadFailed(false);
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
        setActiveProductImage(nextProduct.coverUrl);
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
  const productGallery = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set([product.coverUrl, ...(product.mainImageUrls ?? [])].filter(Boolean)));
  }, [product]);
  const displayedProductImage = productGallery.includes(activeProductImage)
    ? activeProductImage
    : productGallery[0];
  const displayedProductImageIndex = Math.max(0, productGallery.indexOf(displayedProductImage));

  useEffect(() => {
    if (productGallery.length <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setActiveProductImage((current) => {
        const currentIndex = productGallery.indexOf(current);
        return productGallery[(currentIndex + 1 + productGallery.length) % productGallery.length];
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [carouselResetKey, productGallery]);

  const selectProductImage = (imageUrl: string) => {
    setActiveProductImage(imageUrl);
    setCarouselResetKey((current) => current + 1);
  };

  const stepProductImage = (offset: number) => {
    if (productGallery.length <= 1) return;
    const nextIndex = (displayedProductImageIndex + offset + productGallery.length) % productGallery.length;
    selectProductImage(productGallery[nextIndex]);
  };
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

  const startBuy = () => {
    if (!requireLogin() || !product) return;
    const params = new URLSearchParams({
      productId: String(product.productId),
      quantity: '1',
    });
    if (validSourceReportId) params.set('sourceReportId', String(validSourceReportId));
    navigate(`/checkout?${params.toString()}`);
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
    if (reportLoadRequestRef.current || reports.length >= reportTotal) return;
    const nextPage = reportPage + 1;
    const requestedProductId = productId;
    setReportsLoadingMore(true);
    setReportLoadFailed(false);
    const request: Promise<void> = fetchHomeFeed({
      productId: requestedProductId,
      contentType: 'REPORT',
      pageNum: nextPage,
      pageSize: PRODUCT_REPORT_PAGE_SIZE,
    })
      .then((result) => {
        if (reportProductIdRef.current !== requestedProductId) return;
        setReports((current) => {
          const existing = new Set(current.map((item) => item.contentId));
          return [...current, ...result.rows.filter((item) => !existing.has(item.contentId))];
        });
        setReportTotal(result.total);
        setReportPage(nextPage);
      })
      .catch((error) => {
        if (reportProductIdRef.current === requestedProductId) {
          setReportLoadFailed(true);
          message.error(error instanceof Error ? error.message : '更多甄客验加载失败');
        }
      })
      .finally(() => {
        if (reportLoadRequestRef.current === request) {
          reportLoadRequestRef.current = null;
          setReportsLoadingMore(false);
        }
      });
    reportLoadRequestRef.current = request;
    return request;
  };

  useEffect(() => {
    const target = reportLoadMoreRef.current;
    if (productContentTab !== 'REPORT' || !target || reportLoadFailed || reports.length >= reportTotal
      || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMoreReports();
    }, { rootMargin: '240px 0px', threshold: 0.01 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [productContentTab, reportLoadFailed, reportPage, reportTotal, reports.length, reportsLoadingMore]);

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
          <div className={styles.productImageGallery}>
            <div
              className={styles.trialHeroImage}
              onTouchStart={(event) => {
                carouselTouchStartX.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const startX = carouselTouchStartX.current;
                const endX = event.changedTouches[0]?.clientX;
                carouselTouchStartX.current = null;
                if (startX == null || endX == null || Math.abs(endX - startX) < 40) return;
                stepProductImage(endX < startX ? 1 : -1);
              }}
            >
              <img
                key={displayedProductImage}
                className={styles.productGalleryImage}
                src={displayedProductImage}
                alt={product.productName}
              />
              {productGallery.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.productGalleryArrow} ${styles.productGalleryArrowLeft}`}
                    aria-label="上一张商品图片"
                    onClick={() => stepProductImage(-1)}
                  >
                    <LeftOutlined />
                  </button>
                  <button
                    type="button"
                    className={`${styles.productGalleryArrow} ${styles.productGalleryArrowRight}`}
                    aria-label="下一张商品图片"
                    onClick={() => stepProductImage(1)}
                  >
                    <RightOutlined />
                  </button>
                  <div className={styles.productGalleryDots} aria-label="商品轮播图分页">
                    {productGallery.map((imageUrl, index) => (
                      <button
                        key={imageUrl}
                        type="button"
                        className={index === displayedProductImageIndex ? styles.productGalleryDotActive : ''}
                        aria-label={`查看第 ${index + 1} 张商品图片`}
                        aria-current={index === displayedProductImageIndex ? 'true' : undefined}
                        onClick={() => selectProductImage(imageUrl)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {productGallery.length > 1 && (
              <div className={styles.productGalleryThumbs} aria-label="商品图片">
                {productGallery.map((imageUrl, index) => (
                  <button
                    key={imageUrl}
                    type="button"
                    className={`${styles.productGalleryThumb} ${displayedProductImage === imageUrl ? styles.productGalleryThumbActive : ''}`}
                    aria-label={`查看商品图片 ${index + 1}`}
                    aria-pressed={displayedProductImage === imageUrl}
                    onClick={() => selectProductImage(imageUrl)}
                  >
                    <img src={imageUrl} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.trialHeroBody}>
            <div className={styles.productTagRow}>
              <Tag color="green">{product.categoryName}</Tag>
              {product.certificationStatus === 'PASSED' && (
                <Tag color="cyan" icon={<SafetyCertificateOutlined />}>商家承诺正品</Tag>
              )}
            </div>
            <div className={styles.productDetailTitleRow}>
              <Tag color="gold">{product.brandName}</Tag>
              <h1>{product.productName}</h1>
            </div>
            <p>{product.subtitle}</p>
            <strong className={styles.linkedProductPrice}>{formatPrice(product.price)}</strong>
          </div>
        </section>

        {product.certificationStatus === 'PASSED' && (
          <section className={styles.productCertificationPanel}>
            <div className={styles.productCertificationHeading}>
              <span className={styles.productCertificationIcon}><SafetyCertificateOutlined /></span>
              <div>
                <h2>商家承诺正品</h2>
                <p>商家已提交供货材料</p>
              </div>
            </div>
            <dl className={styles.productCertificationGrid}>
              <div><dt>商品来源</dt><dd>{certificationSourceLabels[product.certificationSourceType || ''] || '-'}</dd></div>
              <div><dt>供货方</dt><dd>{product.certificationSupplierName || '-'}</dd></div>
              <div><dt>商品产地</dt><dd>{product.certificationOriginPlace || '-'}</dd></div>
              <div><dt>发货地</dt><dd>{product.certificationShippingPlace || '-'}</dd></div>
              <div><dt>商品核对方式</dt><dd>{certificationMatchLabels[product.certificationMatchType || ''] || '-'}</dd></div>
              <div><dt>已提交材料</dt><dd>{certificationProofLabels[product.certificationProofType || ''] || '-'}</dd></div>
              <div><dt>存证编号</dt><dd>{product.certificationNo || '-'}</dd></div>
              <div><dt>有效期至</dt><dd>{product.certificationExpiresAt?.slice(0, 10) || '-'}</dd></div>
            </dl>
            {product.certificationPublicSummary && (
              <p className={styles.productCertificationSummary}>{product.certificationPublicSummary}</p>
            )}
            <p className={styles.productCertificationDisclaimer}>
              以上信息及材料由商家自主提交，不代表平台对商品真伪、质量或法律合规作出鉴定或担保。
            </p>
          </section>
        )}

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
              {(primaryCampaign?.trial?.trialType === 'OFFLINE' ? offlineTrialFlowSteps : trialFlowSteps).map((step, index) => (
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

        <section className={styles.productContentPanel}>
          <div className={styles.productContentTabs} role="tablist" aria-label="商品内容">
            <button
              id="product-detail-tab"
              type="button"
              role="tab"
              aria-selected={productContentTab === 'DETAIL'}
              aria-controls="product-detail-panel"
              className={productContentTab === 'DETAIL' ? styles.productContentTabActive : ''}
              onClick={() => setProductContentTab('DETAIL')}
            >
              <span>商品详情</span>
              <small>详情图片</small>
            </button>
            <button
              id="product-report-tab"
              type="button"
              role="tab"
              aria-selected={productContentTab === 'REPORT'}
              aria-controls="product-report-panel"
              className={productContentTab === 'REPORT' ? styles.productContentTabActive : ''}
              onClick={() => setProductContentTab('REPORT')}
            >
              <span>甄客验</span>
              <small>{reportTotal} 份真实体验</small>
            </button>
          </div>

          {productContentTab === 'DETAIL' ? (
            <div
              id="product-detail-panel"
              role="tabpanel"
              aria-labelledby="product-detail-tab"
              className={styles.productContentBody}
            >
              {(product.detailImageUrls?.length ?? 0) > 0 ? (
                <div className={styles.productDetailImages}>
                  {product.detailImageUrls?.map((imageUrl, index) => (
                    <img
                      key={imageUrl}
                      src={imageUrl}
                      alt={`${product.productName} 商品详情图 ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.productColumnEmpty}>商家暂未上传商品详情图。</p>
              )}
            </div>
          ) : (
            <div
              id="product-report-panel"
              role="tabpanel"
              aria-labelledby="product-report-tab"
              className={`${styles.productContentBody} ${styles.productReportsBody}`}
            >
              {reports.length > 0 ? (
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
                    <div ref={reportLoadMoreRef} className={styles.productReportLoadMore}>
                      {reportLoadFailed ? (
                        <Button size="small" onClick={() => void loadMoreReports()}>加载失败，点击重试</Button>
                      ) : reportsLoadingMore ? (
                        <Spin size="small" />
                      ) : (
                        <span>继续下滑加载更多</span>
                      )}
                    </div>
                  )}
                  {reports.length >= reportTotal && reportTotal > PRODUCT_REPORT_PAGE_SIZE && (
                    <p className={styles.productReportsEnd}>已经到底了</p>
                  )}
                </div>
              ) : (
                <p className={styles.productColumnEmpty}>暂时还没有甄客验。</p>
              )}
            </div>
          )}
        </section>

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
          <Button type="primary" size="large" className={styles.reportDetailBuy} onClick={startBuy}>
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
              <p>{product.subtitle || `${product.brandName} · ${product.categoryName}`}</p>
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
