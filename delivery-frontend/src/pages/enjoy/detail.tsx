import { AimOutlined, ArrowLeftOutlined, ClockCircleOutlined, EditOutlined, EnvironmentOutlined, HeartFilled, HeartOutlined, MessageOutlined, PhoneOutlined, PictureOutlined, SendOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Button, Image, Input, Popconfirm, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { WechatShareGuide } from '@/components/WechatShareGuide';
import { usePostPublishLauncher } from '@/components/PostPublishLauncher';
import { enjoyCategoryNames } from '@/components/ZhenkeEnjoyCard';
import { ZkState } from '@/components/ZkPage';
import { buildLoginPath, LOGIN_RETURN_TO_SOURCE_STATE } from '@/utils/safeRedirect';
import {
  createEnjoyComment,
  deleteEnjoyComment,
  enjoyCommentReplies,
  enjoyComments,
  enjoyDetail,
  toggleEnjoyLike,
  type EnjoyComment,
  type ZhenkeEnjoy,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { getWechatShareErrorMessage, isWechatBrowser, useWechatShare } from '@/hooks/useWechatShare';
import { useWechatShareGuide } from '@/hooks/useWechatShareGuide';
import { useSafeBack } from '@/hooks/useSafeBack';
import { buildEnjoyShareLink, copyText } from '@/utils/shop';

export default function EnjoyDetailPage() {
  const { enjoyId: rawEnjoyId } = useParams<{ enjoyId: string }>();
  const enjoyId = Number(rawEnjoyId);
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useSafeBack('/enjoy');
  const { user } = useShop();
  const { startPostPublish } = usePostPublishLauncher();
  const [detail, setDetail] = useState<ZhenkeEnjoy>();
  const [comments, setComments] = useState<EnjoyComment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentPage, setCommentPage] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [replyPages, setReplyPages] = useState<Record<number, number>>({});
  const [replyLoading, setReplyLoading] = useState<Record<number, boolean>>({});
  const [replyErrors, setReplyErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyTarget, setReplyTarget] = useState<EnjoyComment>();
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const commentRequestId = useRef(0);
  const replyRequestSequence = useRef(0);
  const replyRequestIds = useRef<Record<number, number>>({});
  const localReplyIds = useRef<Record<number, Set<number>>>({});
  const prepareWechatShare = useWechatShare(detail ? {
    title: `甄必享｜${detail.title}`,
    description: detail.subtitle || detail.serviceSummary,
    link: `/enjoy/${detail.enjoyId}`,
    imageUrl: detail.coverUrl,
  } : null);
  const wechatShareGuide = useWechatShareGuide(prepareWechatShare);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDetail(await enjoyDetail(enjoyId));
    } catch (reason) {
      setDetail(undefined);
      setError(reason instanceof Error ? reason.message : '甄必享内容不存在或已下线');
    }
    setLoading(false);
  }, [enjoyId]);

  const invalidateReplyRequests = useCallback(() => {
    const invalidationId = ++replyRequestSequence.current;
    Object.keys(replyRequestIds.current).forEach((rootCommentId) => {
      replyRequestIds.current[Number(rootCommentId)] = invalidationId;
    });
  }, []);

  const loadComments = useCallback(async (page = 1, append = false) => {
    const requestId = ++commentRequestId.current;
    if (!append) {
      invalidateReplyRequests();
      setReplyLoading({});
    }
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const result = await enjoyComments(enjoyId, page, 10);
      if (requestId !== commentRequestId.current) return;
      setComments((current) => {
        if (!append) return result.rows;
        const merged = new Map(current.map((item) => [item.commentId, item]));
        result.rows.forEach((item) => merged.set(item.commentId, item));
        return Array.from(merged.values());
      });
      setCommentTotal(result.total);
      setCommentPage(page);
      if (!append) {
        localReplyIds.current = {};
        setReplyPages({});
        setReplyErrors({});
        setReplyTarget(undefined);
        setReplyText('');
      }
    } catch (reason) {
      if (requestId === commentRequestId.current) {
        setCommentsError(reason instanceof Error ? reason.message : '评论暂时无法加载');
      }
    } finally {
      if (requestId === commentRequestId.current) setCommentsLoading(false);
    }
  }, [enjoyId, invalidateReplyRequests]);

  const loadReplies = useCallback(async (rootCommentId: number, page = 1, append = false) => {
    const requestId = ++replyRequestSequence.current;
    replyRequestIds.current[rootCommentId] = requestId;
    setReplyLoading((current) => ({ ...current, [rootCommentId]: true }));
    setReplyErrors((current) => ({ ...current, [rootCommentId]: '' }));
    try {
      const result = await enjoyCommentReplies(enjoyId, rootCommentId, page, 10);
      if (replyRequestIds.current[rootCommentId] !== requestId) return;
      setComments((current) => current.map((root) => {
        if (root.commentId !== rootCommentId) return root;
        const locallyCreated = localReplyIds.current[rootCommentId] ?? new Set<number>();
        const preservedReplies = append
          ? (root.replies ?? [])
          : (root.replies ?? []).filter((item) => locallyCreated.has(item.commentId));
        const merged = new Map(preservedReplies.map((item) => [item.commentId, item]));
        result.rows.forEach((item) => merged.set(item.commentId, item));
        const replies = Array.from(merged.values()).sort((left, right) => (
          left.createTime.localeCompare(right.createTime) || left.commentId - right.commentId
        ));
        return { ...root, replies, replyCount: result.total };
      }));
      setReplyPages((current) => ({ ...current, [rootCommentId]: page }));
    } catch (reason) {
      if (replyRequestIds.current[rootCommentId] !== requestId) return;
      setReplyErrors((current) => ({
        ...current,
        [rootCommentId]: reason instanceof Error ? reason.message : '回复暂时无法加载',
      }));
    } finally {
      if (replyRequestIds.current[rootCommentId] === requestId) {
        setReplyLoading((current) => ({ ...current, [rootCommentId]: false }));
      }
    }
  }, [enjoyId]);

  useEffect(() => {
    if (Number.isSafeInteger(enjoyId) && enjoyId > 0) {
      void load();
      void loadComments();
    }
    else {
      setLoading(false);
      setError('甄必享链接无效');
    }
    return () => {
      commentRequestId.current += 1;
      invalidateReplyRequests();
    };
  }, [enjoyId, invalidateReplyRequests, load, loadComments]);

  const requireLogin = () => {
    if (user) return true;
    message.info('登录后可以喜欢、评论和回复');
    navigate(buildLoginPath(`${location.pathname}${location.search}${location.hash}`), {
      state: LOGIN_RETURN_TO_SOURCE_STATE,
    });
    return false;
  };

  const submitComment = async () => {
    if (!requireLogin() || !commentText.trim() || commentSubmitting || replySubmitting) return;
    setCommentSubmitting(true);
    try {
      await createEnjoyComment(enjoyId, commentText.trim());
      setCommentText('');
      setDetail((current) => current
        ? { ...current, commentCount: (current.commentCount ?? 0) + 1 }
        : current);
      await loadComments(1, false);
      message.success('评论已发布');
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '评论发布失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submitReply = async () => {
    if (!replyTarget || !requireLogin() || !replyText.trim() || replySubmitting || commentSubmitting) return;
    const target = replyTarget;
    setReplySubmitting(true);
    try {
      const saved = await createEnjoyComment(enjoyId, replyText.trim(), target.commentId);
      setReplyText('');
      setReplyTarget(undefined);
      setDetail((current) => current
        ? { ...current, commentCount: (current.commentCount ?? 0) + 1 }
        : current);
      if (saved.parentCommentId) {
        const rootLocalReplyIds = localReplyIds.current[saved.parentCommentId] ?? new Set<number>();
        rootLocalReplyIds.add(saved.commentId);
        localReplyIds.current[saved.parentCommentId] = rootLocalReplyIds;
        setComments((current) => current.map((root) => {
          if (root.commentId !== saved.parentCommentId) return root;
          const replies = root.replies ?? [];
          return {
            ...root,
            replyCount: (root.replyCount ?? replies.length) + 1,
            replies: replies.some((item) => item.commentId === saved.commentId)
              ? replies
              : [...replies, saved],
          };
        }));
      } else {
        await loadComments(1, false);
      }
      message.success('回复已发布');
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '回复发布失败');
    } finally {
      setReplySubmitting(false);
    }
  };

  const share = async () => {
    if (!detail) return;
    const shareLink = buildEnjoyShareLink(detail.enjoyId);
    try {
      if (isWechatBrowser()) {
        await wechatShareGuide.show();
        return;
      }
      if (navigator.share) await navigator.share({ title: detail.title, text: detail.subtitle, url: shareLink });
      else {
        await copyText(shareLink);
        message.success('分享链接已复制');
      }
    } catch (reason) {
      if ((reason as DOMException)?.name === 'AbortError') return;
      message.warning(isWechatBrowser()
        ? getWechatShareErrorMessage(reason)
        : '暂时无法分享，请复制浏览器地址');
    }
  };

  if (loading) return <main className={`${styles.page} ${styles.enjoyDetailPage}`}><ZkState kind="loading" title="正在打开甄必享" /></main>;
  if (!detail || error) return <main className={`${styles.page} ${styles.enjoyDetailPage}`}><ZkState kind="error" title="这条甄必享内容已不可见" description={error} actionText="返回甄必享" onAction={() => navigate('/enjoy')} /></main>;

  const gallery = detail.mediaUrls?.length ? detail.mediaUrls : [detail.coverUrl];
  const highlights = detail.highlights?.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean) ?? [];
  const openNavigation = () => {
    if (detail.placeId) window.location.assign(`/api/shop/zhenke/places/${detail.placeId}/navigation`);
  };
  const publishForPlace = () => {
    if (!detail.placeId) return;
    startPostPublish({ placeId: detail.placeId });
  };

  const renderComment = (comment: EnjoyComment, isReply = false) => {
    const replyingHere = replyTarget?.commentId === comment.commentId;
    return (
      <div key={comment.commentId}>
        <article className={`${styles.commentItem} ${isReply ? styles.replyItem : ''}`}>
          <span className={styles.authorAvatar}>{comment.avatar ? <img src={comment.avatar} alt="" /> : (comment.nickName || comment.userName || '甄').slice(0, 1)}</span>
          <div className={styles.commentMain}>
            <strong>{comment.nickName || comment.userName}</strong>
            <p>{comment.replyToName && `回复 ${comment.replyToName}：`}{comment.content}</p>
            <small>{comment.createTime}</small>
            <div className={styles.actionRow}>
              <Button size="small" type="text" disabled={commentSubmitting || replySubmitting} onClick={() => {
                if (!requireLogin()) return;
                if (replyTarget?.commentId === comment.commentId) {
                  setReplyTarget(undefined);
                  setReplyText('');
                  return;
                }
                setReplyText('');
                setReplyTarget(comment);
              }}>回复</Button>
              {user?.id === comment.shopUserId && (
                <Popconfirm disabled={commentSubmitting || replySubmitting} title={isReply ? '确认删除这条回复？' : '确认删除评论及其全部回复？'} onConfirm={async () => {
                  if (commentSubmitting || replySubmitting) return;
                  invalidateReplyRequests();
                  setReplyLoading({});
                  try {
                    await deleteEnjoyComment(enjoyId, comment.commentId);
                    const removedCount = isReply ? 1 : 1 + (comment.replyCount ?? 0);
                    if (replyTarget && (replyTarget.commentId === comment.commentId || replyTarget.parentCommentId === comment.commentId)) {
                      setReplyTarget(undefined);
                      setReplyText('');
                    }
                    setDetail((current) => current
                      ? { ...current, commentCount: Math.max(0, (current.commentCount ?? 0) - removedCount) }
                      : current);
                    await loadComments(1, false);
                    message.success(isReply ? '回复已删除' : '评论已删除');
                  }
                  catch (reason) { message.error(reason instanceof Error ? reason.message : '评论删除失败'); }
                }}><Button size="small" type="text" danger disabled={commentSubmitting || replySubmitting}>删除</Button></Popconfirm>
              )}
            </div>
          </div>
        </article>
        {replyingHere && (
          <div className={styles.inlineReplyComposer}>
            <div className={styles.inlineReplyHeader}>
              <span>回复 <strong>{comment.nickName || comment.userName}</strong></span>
            </div>
            <Input.TextArea
              autoFocus
              rows={2}
              maxLength={500}
              value={replyText}
              disabled={commentSubmitting || replySubmitting}
              aria-label={`回复 ${comment.nickName || comment.userName}`}
              placeholder={`回复 ${comment.nickName || comment.userName}`}
              onChange={(event) => setReplyText(event.target.value)}
            />
            <div className={styles.inlineReplyFooter}>
              <span className={styles.inlineReplyCount}>{replyText.length} / 500</span>
              <div className={styles.inlineReplyActions}>
                <Button disabled={commentSubmitting || replySubmitting} onClick={() => { setReplyTarget(undefined); setReplyText(''); }}>取消</Button>
                <Button type="primary" icon={<SendOutlined />} loading={replySubmitting} disabled={!replyText.trim() || commentSubmitting} onClick={() => void submitReply()}>发布回复</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <main className={`${styles.page} ${styles.enjoyDetailPage}`}>
      <div className={styles.detailTopbar}>
        <button type="button" className={styles.backButton} aria-label="返回" onClick={goBack}><ArrowLeftOutlined /></button>
        <div className={styles.enjoyOfficialIdentity}><span>甄</span><div><strong>甄客行官方精选</strong><small>{enjoyCategoryNames[detail.category]} · 地点专题</small></div></div>
        <Button shape="circle" icon={<ShareAltOutlined />} aria-label="分享" onClick={() => void share()} />
      </div>

      <header className={styles.enjoyFeatureHeader}>
        <span className={styles.eyebrow}>{enjoyCategoryNames[detail.category]} · 官方地点精选</span>
        <h1>{detail.title}</h1>
        <button type="button" className={styles.enjoyFeatureLocation} disabled={!detail.placeId} onClick={() => detail.placeId && navigate(`/places/${detail.placeId}`)}>
          <EnvironmentOutlined />
          <span>{detail.placeName}{detail.placeAddress && ` · ${detail.placeAddress}`}</span>
        </button>
        {detail.subtitle && <p className={styles.enjoyDetailLead}>{detail.subtitle}</p>}
      </header>

      <Image.PreviewGroup>
        <section className={styles.enjoyMediaGallery} aria-label={`地点图片，共 ${gallery.length} 张`}>
          <div className={styles.enjoyMediaHero}>
            <Image src={gallery[0]} alt={`${detail.title}封面`} preview={{ mask: <><PictureOutlined /> 查看大图</> }} />
            <span className={styles.enjoyGalleryCount}><PictureOutlined /> {gallery.length}</span>
          </div>
          {gallery.length > 1 && <div className={styles.enjoyMediaRail}>{gallery.slice(1).map((url, index) => <Image key={`${url}-${index}`} src={url} alt={`${detail.title}图片 ${index + 2}`} loading="lazy" decoding="async" />)}</div>}
        </section>
      </Image.PreviewGroup>

      <article className={`${styles.surface} ${styles.enjoyServiceCard}`}>
        <p className={styles.enjoyServiceSummary}>{detail.serviceSummary}</p>
        {highlights.length > 0 && <div className={styles.enjoyHighlights}>{highlights.map((item) => <span key={item}>{item}</span>)}</div>}

        <div className={styles.enjoyInfoList}>
          <button type="button" className={styles.enjoyInfoRow} disabled={!detail.placeId} onClick={() => detail.placeId && navigate(`/places/${detail.placeId}`)}>
            <span><EnvironmentOutlined /> 地址</span>
            <strong>{detail.placeAddress || detail.placeName}<b>›</b></strong>
          </button>
          <div className={styles.enjoyInfoRow}>
            <span><ClockCircleOutlined /> 营业 / 开放</span>
            <strong>{detail.openingHours || '以地点当日公示为准'}</strong>
          </div>
          {detail.contactPhone && <a className={styles.enjoyInfoRow} href={`tel:${detail.contactPhone.replace(/\s/g, '')}`}>
            <span><PhoneOutlined /> 电话</span><strong>{detail.contactPhone}</strong>
          </a>}
        </div>

        <div className={styles.enjoyFeatureActions}>
          <Button size="large" icon={<AimOutlined />} disabled={!detail.placeId} onClick={openNavigation}>地图导航</Button>
          <Button size="large" type="primary" icon={<EditOutlined />} disabled={!detail.placeId} onClick={publishForPlace}>发布甄客帖</Button>
        </div>
        <p className={styles.enjoyActionHint}>去过这里？发布真实体验，帮助更多人做决定。</p>
      </article>

      <article className={`${styles.surface} ${styles.enjoyStorySection}`}>
        <div className={styles.sectionTitle}><div><span className={styles.eyebrow}>ZHENKE EDITORIAL</span><h2>官方详细攻略</h2></div></div>
        <div className={styles.prose}>{detail.content}</div>
        <div className={styles.actionRow}>
          <Button type={detail.likedByMe ? 'primary' : 'default'} icon={detail.likedByMe ? <HeartFilled /> : <HeartOutlined />} loading={liking} onClick={async () => {
            if (!requireLogin() || liking) return;
            setLiking(true);
            try { const result = await toggleEnjoyLike(enjoyId); setDetail((current) => current ? { ...current, likedByMe: result.liked, likeCount: result.likeCount } : current); }
            catch (reason) { message.error(reason instanceof Error ? reason.message : '“喜欢”状态更新失败'); }
            finally { setLiking(false); }
          }}>{detail.likedByMe ? '已喜欢' : '喜欢'} · {detail.likeCount ?? 0} 人喜欢</Button>
          <Button icon={<MessageOutlined />} onClick={() => document.getElementById('enjoy-comments')?.scrollIntoView({ behavior: 'smooth' })}>评论 {detail.commentCount ?? 0}</Button>
          <Button icon={<ShareAltOutlined />} onClick={() => void share()}>分享</Button>
        </div>
      </article>
      <section id="enjoy-comments" className={`${styles.surface} ${styles.commentsPanel}`}>
        <div className={styles.sectionTitle}><div><h2>评价与交流</h2></div></div>
        <div className={styles.commentComposer}>
          <Input.TextArea rows={3} maxLength={500} showCount value={commentText} disabled={commentSubmitting} placeholder={user ? '说说你对这条精选内容的看法' : '登录后参与评价和交流'} onFocus={() => requireLogin()} onChange={(event) => setCommentText(event.target.value)} />
          <Button type="primary" icon={<SendOutlined />} loading={commentSubmitting} disabled={!commentText.trim() || replySubmitting} onClick={() => void submitComment()}>发表评论</Button>
        </div>
        {commentsLoading && comments.length === 0 && <ZkState kind="loading" title="正在加载评论" />}
        {commentsError && (
          <ZkState
            kind="error"
            title="评论暂时无法加载"
            description={commentsError}
            actionText="重试"
            onAction={() => void loadComments(comments.length > 0 ? commentPage + 1 : 1, comments.length > 0)}
          />
        )}
        {!commentsLoading && !commentsError && comments.length === 0 ? (
          <ZkState title="还没有评价" description="成为第一个参与交流的人。" />
        ) : comments.map((root) => {
          const shownReplies = root.replies ?? [];
          const replyPage = replyPages[root.commentId] ?? 0;
          const remainingReplies = Math.max(0, (root.replyCount ?? 0) - shownReplies.length);
          return (
            <div key={root.commentId} className={styles.commentThread}>
              {renderComment(root)}
              {shownReplies.map((item) => renderComment(item, true))}
              {replyErrors[root.commentId] && (
                <div className={styles.replyPager}>
                  <Button
                    type="link"
                    danger
                    onClick={() => void loadReplies(root.commentId, replyPage > 0 ? replyPage + 1 : 1, replyPage > 0)}
                  >回复加载失败，重新加载</Button>
                </div>
              )}
              {!replyErrors[root.commentId] && remainingReplies > 0 && (
                <div className={styles.replyPager}>
                  <Button
                    type="link"
                    loading={replyLoading[root.commentId]}
                    onClick={() => void loadReplies(root.commentId, replyPage > 0 ? replyPage + 1 : 1, replyPage > 0)}
                  >{replyPage > 0 ? `查看更多回复（还剩 ${remainingReplies} 条）` : `展开其余 ${remainingReplies} 条回复`}</Button>
                </div>
              )}
            </div>
          );
        })}
        {comments.length < commentTotal && (
          <div className={styles.commentPager}>
            <Button loading={commentsLoading} onClick={() => void loadComments(commentPage + 1, true)}>
              查看更多评论（还剩 {commentTotal - comments.length} 条）
            </Button>
          </div>
        )}
      </section>
      </main>
      <WechatShareGuide open={wechatShareGuide.open} onClose={wechatShareGuide.close} />
    </>
  );
}
