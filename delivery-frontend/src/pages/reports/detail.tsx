import {
  ArrowLeftOutlined,
  CloseOutlined,
  DeleteOutlined,
  LikeFilled,
  LikeOutlined,
  LinkOutlined,
  MessageOutlined,
  PlayCircleFilled,
  ShareAltOutlined,
  ZoomInOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Image, Input, Modal, Spin, Tag, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { WechatShareGuide } from '@/components/WechatShareGuide';
import { MerchantInfoBar } from '@/components/MerchantInfoBar';
import { VerificationProofStrip } from '@/components/VerificationProofStrip';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { isWechatBrowser, useWechatShare } from '@/hooks/useWechatShare';
import {
  createReportComment,
  deleteReportComment,
  fetchPublicProduct,
  fetchPublishedReport,
  fetchReportComments,
  toggleReportUseful,
  type PublicProductDto,
  type ReportCommentDto,
  type VerificationReportDto,
} from '@/services/shopContent';
import { buildLoginPath } from '@/utils/safeRedirect';
import { buildReportShareLink, copyText, formatPrice, getReportType } from '@/utils/shop';
import styles from '@/styles/commerce.less';

function CommentItem({
  comment,
  reply,
  currentUserId,
  deleting,
  onReply,
  onDelete,
}: {
  comment: ReportCommentDto;
  reply?: boolean;
  currentUserId?: number;
  deleting: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const displayName = comment.nickName || comment.userName;
  const replyToName = comment.replyToNickName || comment.replyToUserName;
  return (
    <article className={`${styles.commentItem} ${reply ? styles.commentReply : ''}`}>
      <div className={styles.commentAvatar}>
        {comment.avatar ? <img src={comment.avatar} alt={displayName} /> : displayName.slice(0, 1)}
      </div>
      <div className={styles.commentBody}>
        <div className={styles.commentMeta}>
          <strong>{displayName}</strong>
          {comment.reportAuthor && <span className={styles.commentAuthorBadge}>作者</span>}
          <span>{comment.createTime}</span>
        </div>
        <p>
          {reply && replyToName && <em>回复 {replyToName}：</em>}
          {comment.content}
        </p>
        <div className={styles.commentActions}>
          <Button type="link" size="small" onClick={onReply}>回复</Button>
          {currentUserId === comment.shopUserId && (
            <Button type="link" danger size="small" loading={deleting} icon={<DeleteOutlined />} onClick={onDelete}>
              删除
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ReportDetailPage({ reportId: reportIdProp }: { reportId?: number }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, replaceReport } = useShop();
  const routeId = Number(params.reportId);
  const reportId = reportIdProp ?? routeId;
  const [report, setReport] = useState<VerificationReportDto | null>(null);
  const [product, setProduct] = useState<PublicProductDto | null>(null);
  const [comments, setComments] = useState<ReportCommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReportCommentDto | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [usefulLoading, setUsefulLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [wechatShareGuideOpen, setWechatShareGuideOpen] = useState(false);
  const [activeResourceIndex, setActiveResourceIndex] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  useBodyScrollLock(shareOpen || Boolean(videoPreviewUrl));
  const shareAuthorName = report ? (report.nickName || report.userName) : '';
  const sharePreviewImage = report?.resources?.find((item) => item.resourceType === 'IMAGE')?.resourceUrl
    || report?.productCoverUrl
    || product?.coverUrl
    || '';
  const reportProductShareName = product ? `${product.brandName} ${product.productName}` : '';
  const prepareWechatShare = useWechatShare(report && product ? {
    title: `甄客验｜${reportProductShareName}`,
    description: `${shareAuthorName}：${report.experience.slice(0, 60)}`,
    link: buildReportShareLink(report.reportId),
    imageUrl: sharePreviewImage,
  } : null);

  useEffect(() => {
    setActiveResourceIndex(0);
    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetchPublishedReport(reportId)
      .then(async (nextReport) => {
        const nextProduct = await fetchPublicProduct(nextReport.productId);
        if (!mounted) return;
        setReport(nextReport);
        setProduct(nextProduct);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '甄客验加载失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    setCommentsLoading(true);
    fetchReportComments(reportId)
      .then((rows) => {
        if (mounted) setComments(rows);
      })
      .catch((error) => {
        if (mounted) message.error(error instanceof Error ? error.message : '评论加载失败');
      })
      .finally(() => {
        if (mounted) setCommentsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reportId]);

  const commentCount = useMemo(
    () => comments.reduce((count, item) => count + 1 + (item.replies?.length ?? 0), 0),
    [comments],
  );

  const refreshComments = async () => {
    setComments(await fetchReportComments(reportId));
  };

  const submitComment = async () => {
    if (!user) {
      navigate(buildLoginPath(`${location.pathname}${location.search}${location.hash}`));
      return;
    }
    const content = comment.trim();
    if (!content) {
      message.warning('请输入评论内容');
      return;
    }
    setCommentSubmitting(true);
    try {
      await createReportComment(reportId, content, replyingTo?.commentId);
      setComment('');
      setReplyingTo(null);
      await refreshComments();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '评论发布失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const confirmDelete = (target: ReportCommentDto) => {
    Modal.confirm({
      title: '删除评论',
      content: target.parentCommentId ? '确定删除这条回复吗？' : '删除一级评论后，其回复也会一起隐藏。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingId(target.commentId);
        try {
          await deleteReportComment(reportId, target.commentId);
          await refreshComments();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '评论删除失败');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const useful = async () => {
    if (!user) {
      navigate(buildLoginPath(`${location.pathname}${location.search}${location.hash}`));
      return;
    }
    if (!report || report.shopUserId === user.id) {
      message.warning('不能给自己的甄客验点有用');
      return;
    }
    setUsefulLoading(true);
    try {
      const result = await toggleReportUseful(report.reportId);
      const updated = { ...report, ...result };
      setReport(updated);
      replaceReport(updated);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setUsefulLoading(false);
    }
  };

  const copyShareLink = async () => {
    const link = buildReportShareLink(reportId);
    try {
      await copyText(link);
      message.success('链接已复制，去粘贴给好友吧');
      setShareOpen(false);
    } catch {
      message.info(`复制失败，可手动复制：${link}`);
    }
  };

  const handleShareClick = () => {
    if (isWechatBrowser()) {
      void prepareWechatShare()
        .then(() => setWechatShareGuideOpen(true))
        .catch(() => message.error('微信分享卡片准备失败，请刷新页面后重试'));
      return;
    }
    setShareOpen(true);
  };

  if (loading) return <main className={styles.sessionLoading}><Spin size="large" /></main>;
  if (!report || !product) {
    return (
      <main className={styles.singleColumn}>
        <p className={styles.empty}>这份甄客验不存在或暂不可见。</p>
        <Button block onClick={() => navigate('/')}>返回首页</Button>
      </main>
    );
  }

  const type = getReportType(report);
  const authorName = report.nickName || report.userName;
  const reportResources = report.resources ?? [];
  const activeResource = reportResources.length
    ? reportResources[Math.min(activeResourceIndex, reportResources.length - 1)]
    : undefined;
  return (
    <>
      <main className={`${styles.journeyPage} ${styles.reportDetailPage}`}>
        <header className={styles.reportDetailBar}>
          <button type="button" className={styles.reportDetailBack} aria-label="返回" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined />
          </button>
          <div className={styles.reportDetailBarAuthor}>
            <span className={styles.reportDetailAvatar}>{authorName.slice(0, 1)}</span>
            <strong>{authorName}</strong>
          </div>
          <button type="button" className={styles.reportDetailShare} aria-label="分享甄客验" onClick={handleShareClick}>
            <ShareAltOutlined />
          </button>
        </header>
        <VerificationProofStrip report={report} />

        <section className={styles.reportDetail}>
          <div className={styles.reportDetailGallery}>
            <div className={styles.reportDetailImage}>
              {activeResource
                ? (
                  <>
                    {activeResource.resourceType === 'VIDEO'
                      ? (
                        <button
                          type="button"
                          className={styles.reportDetailVideoStage}
                          aria-label="播放甄客视频"
                          onClick={() => setVideoPreviewUrl(activeResource.resourceUrl)}
                        >
                          <video key={activeResource.resourceUrl} src={activeResource.resourceUrl} muted playsInline preload="metadata" />
                          <span className={styles.reportDetailVideoPlay}>
                            <PlayCircleFilled />
                            <strong>播放视频</strong>
                          </span>
                        </button>
                      )
                      : (
                        <Image.PreviewGroup>
                          <Image
                            key={activeResource.resourceUrl}
                            rootClassName={styles.reportDetailPreviewImage}
                            src={activeResource.resourceUrl}
                            alt={`${authorName}的实拍`}
                            preview={{
                              cover: <span className={styles.imagePreviewMask}><ZoomInOutlined />点击放大</span>,
                            }}
                          />
                          {reportResources
                            .filter((resource) => resource.resourceType === 'IMAGE' && resource.resourceId !== activeResource.resourceId)
                            .map((resource, index) => (
                              <span className={styles.imagePreviewHidden} key={resource.resourceId}>
                                <Image src={resource.resourceUrl} alt={`${authorName}的实拍 ${index + 2}`} />
                              </span>
                            ))}
                        </Image.PreviewGroup>
                      )}
                    <span className={styles.reportDetailPhotoBadge}>
                      {activeResource.resourceType === 'VIDEO' ? '甄客视频 · 可播放' : '甄客实拍'}
                    </span>
                  </>
                )
                : <div className={styles.reportDetailMediaMissing}>体验图片缺失</div>}
            </div>
            {reportResources.length > 1 && (
              <div className={styles.reportDetailThumbs}>
                {reportResources.map((resource, index) => (
                  <button
                    type="button"
                    key={`${resource.resourceId}-${resource.resourceUrl}`}
                    aria-label={`查看第 ${index + 1} 个体验资源`}
                    className={index === activeResourceIndex ? styles.reportDetailThumbActive : ''}
                    onClick={() => {
                      setActiveResourceIndex(index);
                      if (resource.resourceType === 'VIDEO') setVideoPreviewUrl(resource.resourceUrl);
                    }}
                  >
                    {resource.resourceType === 'VIDEO'
                      ? (
                        <>
                          <video src={resource.resourceUrl} muted preload="metadata" />
                          <span className={styles.reportDetailVideoThumbLabel}>视频</span>
                        </>
                      )
                      : <img src={resource.resourceUrl} alt={`实拍${index + 1}`} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.reportDetailContent}>
            <Tag color={type.color}>{type.label}</Tag>
            <h1>{report.title || report.productName}</h1>
            {report.title && <p className={styles.reportDetailProductName}>关于「{report.productName}」</p>}
            <div className={styles.reportDetailAuthorMeta}>
              <span className={styles.reportDetailAvatarSmall}>{authorName.slice(0, 1)}</span>
              <strong>{authorName}</strong>
              <em>{report.publishedAt}</em>
            </div>
            {report.reportSource === 'PURCHASE' && (
              <div className={styles.purchaseReportRatings}>
                <span><b>{report.productQuality}.0</b>真实</span>
                <span><b>{report.logisticsService}.0</b>物流服务</span>
                <span><b>{report.serviceAttitude}.0</b>服务态度</span>
              </div>
            )}
            <h2 className={styles.reportDetailSubhead}>真实体验</h2>
            <p className={styles.reportDetailText}>{report.experience}</p>
            <div className={styles.shortcoming}>优化建议：{report.shortcoming}</div>
          </div>
        </section>

        <MerchantInfoBar merchantId={product.merchantId} merchantName={product.merchantName} />

        <section
          className={styles.linkedProductCard}
          onClick={() => navigate(`/products/${product.productId}?sourceReport=${report.reportId}`)}
        >
          <img src={product.coverUrl} alt={product.productName} />
          <div className={styles.linkedProductInfo}>
            <p className={styles.linkedProductTitle}>{product.productName}</p>
            <strong className={styles.linkedProductPrice}>{formatPrice(product.price)}</strong>
          </div>
          <Button type="primary">查看商品</Button>
        </section>

        <section className={styles.reportComments}>
          <div className={styles.commentSectionHeader}><h2>全部评论 <span>{commentCount}</span></h2></div>
          <div className={styles.commentComposer}>
            {replyingTo && (
              <div className={styles.replyingHint}>
                <span>回复 {replyingTo.nickName || replyingTo.userName}</span>
                <Button type="link" size="small" onClick={() => setReplyingTo(null)}>取消回复</Button>
              </div>
            )}
            <Input.TextArea
              value={comment}
              maxLength={500}
              showCount
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={user ? (replyingTo ? '写下你的回复' : '说说你对这份甄客验的看法') : '登录后可以评论和回复'}
              onChange={(event) => setComment(event.target.value)}
              onClick={() => {
                if (!user) navigate(buildLoginPath(`${location.pathname}${location.search}${location.hash}`));
              }}
            />
            <Button type="primary" loading={commentSubmitting} onClick={() => void submitComment()}>
              {user ? (replyingTo ? '发布回复' : '发布评论') : '登录并评论'}
            </Button>
          </div>
          <Spin spinning={commentsLoading}>
            <div className={styles.commentList}>
              {comments.map((item) => (
                <div key={item.commentId} className={styles.commentThread}>
                  <CommentItem
                    comment={item}
                    currentUserId={user?.id}
                    deleting={deletingId === item.commentId}
                    onReply={() => setReplyingTo(item)}
                    onDelete={() => confirmDelete(item)}
                  />
                  {(item.replies ?? []).map((reply) => (
                    <CommentItem
                      key={reply.commentId}
                      comment={reply}
                      reply
                      currentUserId={user?.id}
                      deleting={deletingId === reply.commentId}
                      onReply={() => setReplyingTo(reply)}
                      onDelete={() => confirmDelete(reply)}
                    />
                  ))}
                </div>
              ))}
              {!commentsLoading && comments.length === 0 && <p className={styles.empty}>还没有评论，来发表第一条真实看法吧。</p>}
            </div>
          </Spin>
        </section>

        <div className={styles.reportDetailBottomBar}>
          <button
            type="button"
            className={`${styles.reportDetailBottomAction} ${report.usefulByMe ? styles.reportDetailBottomActive : ''}`}
            disabled={usefulLoading}
            onClick={() => void useful()}
          >
            {report.usefulByMe ? <LikeFilled /> : <LikeOutlined />}
            <span>{report.usefulCount}</span>
          </button>
          <div className={styles.reportDetailBottomAction}><MessageOutlined /><span>{commentCount}</span></div>
          <Button
            type="primary"
            size="large"
            className={styles.reportDetailBuy}
            onClick={() => navigate(`/products/${product.productId}?sourceReport=${report.reportId}`)}
          >
            查看商品
          </Button>
        </div>
      </main>

      <Modal
        open={Boolean(videoPreviewUrl)}
        onCancel={() => setVideoPreviewUrl('')}
        footer={null}
        closable={false}
        mask={{ closable: true }}
        width={960}
        centered
        destroyOnHidden
        rootClassName={styles.videoPreviewModal}
      >
        <div className={styles.videoPreviewPlayer}>
          <button
            type="button"
            className={styles.videoPreviewClose}
            aria-label="退出全屏播放"
            onClick={() => setVideoPreviewUrl('')}
          >
            <CloseOutlined />
            关闭
          </button>
          {videoPreviewUrl && (
            <video key={videoPreviewUrl} src={videoPreviewUrl} controls autoPlay playsInline preload="metadata" />
          )}
        </div>
      </Modal>

      <Drawer
        title="分享甄客验"
        placement="bottom"
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        size="auto"
        rootClassName={styles.responsiveDrawer}
      >
        <div className={styles.shareSheet}>
          <div className={styles.sharePreview}>
            {sharePreviewImage && <img src={sharePreviewImage} alt={`${authorName}的甄客验`} />}
            <div className={styles.sharePreviewText}>
              <strong>甄客验｜{reportProductShareName}</strong>
              <p>{report.experience.slice(0, 40)}</p>
            </div>
          </div>
          <div className={styles.shareLinkBox}>
            <LinkOutlined />
            <span className={styles.shareLinkText}>{buildReportShareLink(report.reportId)}</span>
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
      <WechatShareGuide open={wechatShareGuideOpen} onClose={() => setWechatShareGuideOpen(false)} />
    </>
  );
}
