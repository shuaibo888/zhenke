import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  EnvironmentOutlined,
  MessageOutlined,
  SendOutlined,
  ShareAltOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Button, Input, Popconfirm, message } from 'antd';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { WechatShareGuide } from '@/components/WechatShareGuide';
import { perspectiveNames } from '@/components/ZhenkePostCard';
import { ZkState } from '@/components/ZkPage';
import {
  commentReplies,
  comments as fetchComments,
  createComment,
  deleteComment,
  post,
  removePost,
  toggleUseful,
  type PostComment,
  type ZhenkePost,
} from '@/services/zhenke';
import { getWechatShareErrorMessage, isWechatBrowser, useWechatShare } from '@/hooks/useWechatShare';
import { useWechatShareGuide } from '@/hooks/useWechatShareGuide';
import { useSafeBack } from '@/hooks/useSafeBack';
import { buildLoginPath, LOGIN_RETURN_TO_SOURCE_STATE } from '@/utils/safeRedirect';
import { buildPostShareLink, copyText } from '@/utils/shop';
import styles from '@/styles/zhenke.less';

export default function PostDetailPage() {
  const { postId: rawPostId } = useParams<{ postId: string }>();
  const postId = Number(rawPostId);
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const goBack = useSafeBack('/posts');
  const { user } = useShop();
  const [detail, setDetail] = useState<ZhenkePost>();
  const [commentRows, setCommentRows] = useState<PostComment[]>([]);
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
  const [replyTarget, setReplyTarget] = useState<PostComment>();
  const [replyText, setReplyText] = useState('');
  const [submittingCommentKey, setSubmittingCommentKey] = useState<number | 'root'>();
  const [usefulSubmitting, setUsefulSubmitting] = useState(false);
  const commentRequestId = useRef(0);
  const replyRequestSequence = useRef(0);
  const activeReplyRequestIds = useRef<Record<number, number>>({});
  const localReplyIds = useRef<Record<number, Set<number>>>({});
  const sharePreviewImage = detail?.resources.find((item) => item.resourceType === 'IMAGE')?.resourceUrl ?? '';
  const prepareWechatShare = useWechatShare(detail ? {
    title: `甄客帖｜${detail.title}`,
    description: `${detail.nickName || detail.userName || '甄客行用户'}：${detail.content.slice(0, 60)}`,
    link: `/posts/${detail.postId}`,
    imageUrl: sharePreviewImage,
  } : null);
  const wechatShareGuide = useWechatShareGuide(prepareWechatShare);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDetail(await post(postId));
    } catch (reason) {
      setDetail(undefined);
      setError(reason instanceof Error ? reason.message : '甄客帖不存在或已删除');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const loadComments = useCallback(async (page = 1, append = false) => {
    const requestId = ++commentRequestId.current;
    if (!append) {
      activeReplyRequestIds.current = {};
      setReplyLoading({});
    }
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const result = await fetchComments(postId, page, 10);
      if (requestId !== commentRequestId.current) return;
      setCommentRows((current) => {
        if (!append) return result.rows;
        const merged = new Map(current.map((item) => [item.commentId, item]));
        result.rows.forEach((item) => merged.set(item.commentId, item));
        return Array.from(merged.values());
      });
      setCommentTotal(result.total);
      setCommentPage(page);
      if (!append) {
        localReplyIds.current = {};
        setReplyTarget(undefined);
        setReplyText('');
        setReplyPages({});
        setReplyErrors({});
      }
    } catch (reason) {
      if (requestId === commentRequestId.current) {
        setCommentsError(reason instanceof Error ? reason.message : '评论暂时无法加载');
      }
    } finally {
      if (requestId === commentRequestId.current) setCommentsLoading(false);
    }
  }, [postId]);

  const loadReplies = useCallback(async (rootCommentId: number, page = 1) => {
    const requestId = ++replyRequestSequence.current;
    activeReplyRequestIds.current[rootCommentId] = requestId;
    setReplyLoading((current) => ({ ...current, [rootCommentId]: true }));
    setReplyErrors((current) => ({ ...current, [rootCommentId]: '' }));
    try {
      const result = await commentReplies(postId, rootCommentId, page, 10);
      if (activeReplyRequestIds.current[rootCommentId] !== requestId) return;
      setCommentRows((current) => current.map((root) => {
        if (root.commentId !== rootCommentId) return root;
        const locallyCreated = localReplyIds.current[rootCommentId] ?? new Set<number>();
        const preservedReplies = page > 1
          ? (root.replies ?? [])
          : (root.replies ?? []).filter((item) => locallyCreated.has(item.commentId));
        const merged = new Map(preservedReplies.map((item) => [item.commentId, item]));
        result.rows.forEach((item) => merged.set(item.commentId, item));
        const replies = Array.from(merged.values()).sort((left, right) => {
          const timeOrder = left.createTime.localeCompare(right.createTime);
          return timeOrder || left.commentId - right.commentId;
        });
        return { ...root, replies, replyCount: result.total };
      }));
      setReplyPages((current) => ({ ...current, [rootCommentId]: page }));
    } catch (reason) {
      if (activeReplyRequestIds.current[rootCommentId] === requestId) {
        setReplyErrors((current) => ({
          ...current,
          [rootCommentId]: reason instanceof Error ? reason.message : '回复暂时无法加载',
        }));
      }
    } finally {
      if (activeReplyRequestIds.current[rootCommentId] === requestId) {
        delete activeReplyRequestIds.current[rootCommentId];
        setReplyLoading((current) => ({ ...current, [rootCommentId]: false }));
      }
    }
  }, [postId]);

  useEffect(() => {
    if (Number.isSafeInteger(postId) && postId > 0) {
      void load();
      void loadComments();
    }
    else {
      setLoading(false);
      setError('甄客帖链接无效');
    }
    return () => {
      commentRequestId.current += 1;
      activeReplyRequestIds.current = {};
    };
  }, [load, loadComments, postId]);

  const requireLogin = () => {
    if (user) return true;
    message.info('登录后可评论、回复和标记有用');
    navigate(buildLoginPath(`${routeLocation.pathname}${routeLocation.search}${routeLocation.hash}`), {
      state: LOGIN_RETURN_TO_SOURCE_STATE,
    });
    return false;
  };

  const submitComment = async (target?: PostComment) => {
    const content = target ? replyText : commentText;
    if (!requireLogin() || !content.trim() || submittingCommentKey !== undefined) return;
    const replying = Boolean(target);
    setSubmittingCommentKey(target?.commentId ?? 'root');
    try {
      const saved = await createComment(postId, content.trim(), target?.commentId);
      if (replying) {
        setReplyText('');
        setReplyTarget(undefined);
      } else {
        setCommentText('');
      }
      setDetail((current) => current
        ? { ...current, commentCount: (current.commentCount ?? 0) + 1 }
        : current);
      if (saved.parentCommentId) {
        const rootLocalReplyIds = localReplyIds.current[saved.parentCommentId] ?? new Set<number>();
        rootLocalReplyIds.add(saved.commentId);
        localReplyIds.current[saved.parentCommentId] = rootLocalReplyIds;
        setCommentRows((current) => current.map((root) => {
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
      message.success(replying ? '回复已发布' : '评论已发布');
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : (replying ? '回复发布失败' : '评论发布失败'));
    } finally {
      setSubmittingCommentKey(undefined);
    }
  };

  const share = async () => {
    if (!detail) return;
    const shareLink = buildPostShareLink(detail.postId);
    const shareData = {
      title: detail.title,
      text: detail.content.slice(0, 100),
      url: shareLink,
    };
    try {
      if (isWechatBrowser()) {
        await wechatShareGuide.show();
        return;
      }
      if (navigator.share) await navigator.share(shareData);
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

  if (loading) {
    return <main className={`${styles.page} ${styles.detailPage}`}><ZkState kind="loading" title="正在打开甄客帖" /></main>;
  }
  if (!detail || error) {
    return (
      <main className={`${styles.page} ${styles.detailPage}`}>
        <ZkState
          kind="error"
          title="这篇甄客帖已不可见"
          description={error || '可能已被作者或平台删除。媒体与正文不会继续通过旧分享链接展示。'}
          actionText={Number.isSafeInteger(postId) && postId > 0 ? '重新加载' : '返回甄客帖'}
          onAction={Number.isSafeInteger(postId) && postId > 0 ? () => void load() : () => navigate('/posts')}
        />
        {Number.isSafeInteger(postId) && postId > 0 && <Button block onClick={() => navigate('/posts')}>返回甄客帖</Button>}
      </main>
    );
  }

  const authorName = detail.nickName || detail.userName || '甄客行用户';
  const authorInitial = authorName.slice(0, 1);
  const firstImageIndex = detail.resources.findIndex((resource) => resource.resourceType === 'IMAGE');
  const ownPost = user?.id === detail.shopUserId;

  const closeReplyComposer = () => {
    setReplyTarget(undefined);
    setReplyText('');
  };

  const renderCommentComposer = (target?: PostComment) => {
    const targetName = target ? (target.nickName || target.userName || '该用户') : '';
    const composerKey = target?.commentId ?? 'root';
    if (target) {
      return (
        <div className={styles.inlineReplyComposer}>
          <div className={styles.inlineReplyHeader}>
            <span>回复 <strong>{targetName}</strong></span>
          </div>
          <Input.TextArea
            autoFocus
            rows={2}
            maxLength={500}
            disabled={submittingCommentKey !== undefined}
            value={replyText}
            aria-label={`回复 ${targetName}`}
            placeholder={`回复 ${targetName}`}
            onChange={(event) => setReplyText(event.target.value)}
          />
          <div className={styles.inlineReplyFooter}>
            <span className={styles.inlineReplyCount}>{replyText.length} / 500</span>
            <div className={styles.inlineReplyActions}>
              <Button disabled={submittingCommentKey !== undefined} onClick={closeReplyComposer}>取消</Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submittingCommentKey === composerKey}
                disabled={!replyText.trim() || submittingCommentKey !== undefined}
                onClick={() => void submitComment(target)}
              >发布回复</Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.commentComposer}>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          disabled={submittingCommentKey !== undefined}
          value={commentText}
          aria-label="发表评论"
          placeholder={user ? '友善交流，补充更多地点信息' : '登录后参与评论与回复'}
          onFocus={() => requireLogin()}
          onChange={(event) => setCommentText(event.target.value)}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={submittingCommentKey === composerKey}
          disabled={!commentText.trim() || submittingCommentKey !== undefined}
          onClick={() => void submitComment()}
        >发表评论</Button>
      </div>
    );
  };

  const renderComment = (comment: PostComment, reply = false) => (
    <Fragment key={comment.commentId}>
      <article className={`${styles.commentItem} ${reply ? styles.replyItem : ''}`}>
        <span className={styles.authorAvatar}>
          {comment.avatar ? <img src={comment.avatar} alt="" /> : (comment.nickName || comment.userName || '甄').slice(0, 1)}
        </span>
        <div className={styles.commentMain}>
          <strong>
            {comment.nickName || comment.userName}
            {comment.postAuthor && ' · 作者'}
          </strong>
          <p>{comment.replyToName && `回复 ${comment.replyToName}：`}{comment.content}</p>
          <small>{comment.createTime}</small>
          <div className={styles.actionRow}>
            <Button size="small" type="text" disabled={submittingCommentKey !== undefined} onClick={() => {
              if (!requireLogin()) return;
              if (replyTarget?.commentId === comment.commentId) {
                closeReplyComposer();
                return;
              }
              setReplyText('');
              setReplyTarget(comment);
            }}>回复</Button>
            {user?.id === comment.shopUserId && (
              <Popconfirm
                title={reply ? '确认删除这条回复？' : '确认删除评论及其全部回复？'}
                disabled={submittingCommentKey !== undefined}
                onConfirm={async () => {
                  if (submittingCommentKey !== undefined) return;
                  try {
                    await deleteComment(postId, comment.commentId);
                    closeReplyComposer();
                    const removedCount = reply ? 1 : 1 + (comment.replyCount ?? 0);
                    setDetail((current) => current
                      ? { ...current, commentCount: Math.max(0, (current.commentCount ?? 0) - removedCount) }
                      : current);
                    await loadComments(1, false);
                    message.success(reply ? '回复已删除' : '评论已删除');
                  } catch (reason) {
                    message.error(reason instanceof Error ? reason.message : '评论删除失败');
                  }
                }}
              >
                <Button size="small" type="text" danger disabled={submittingCommentKey !== undefined}>删除</Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </article>
      {replyTarget?.commentId === comment.commentId && renderCommentComposer(comment)}
    </Fragment>
  );

  return (
    <>
      <main className={`${styles.page} ${styles.detailPage}`}>
      <div className={styles.detailTopbar}>
        <button type="button" className={styles.backButton} aria-label="返回" onClick={goBack}>
          <ArrowLeftOutlined />
        </button>
        <div className={styles.authorRow}>
          <span className={styles.authorAvatar}>{detail.avatar ? <img src={detail.avatar} alt="" /> : authorInitial}</span>
          <span className={styles.authorCopy}>
            <strong>{authorName}</strong>
            <small>{detail.placeCity || detail.placeProvince || '城市待补充'} · {perspectiveNames[detail.perspective]} · {detail.publishedAt}</small>
          </span>
        </div>
        <Button shape="circle" icon={<ShareAltOutlined />} aria-label="分享" onClick={() => void share()} />
      </div>

      <div className={styles.detailGallery}>
        {detail.resources.map((resource, index) => resource.resourceType === 'VIDEO' ? (
          <video key={resource.resourceId ?? resource.resourceUrl} controls playsInline preload="metadata" src={resource.resourceUrl} />
        ) : (
          <img
            key={resource.resourceId ?? resource.resourceUrl}
            src={resource.resourceUrl}
            alt={detail.title}
            loading={index === firstImageIndex ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </div>

      <article className={`${styles.surface} ${styles.detailContent}`}>
        <span className={styles.eyebrow}>{detail.featured ? '编辑推荐 · 甄客帖' : '甄客帖 · 发布者主动分享'}</span>
        <h1>{detail.title}</h1>
        <div className={styles.prose}>{detail.content}</div>
        {detail.suggestion && (
          <div className={styles.suggestionBox}>
            <strong>给后来人的建议</strong>
            <div className={styles.prose}>{detail.suggestion}</div>
          </div>
        )}
        <div className={styles.actionRow}>
          <Button
            type={detail.usefulByMe ? 'primary' : 'default'}
            icon={detail.usefulByMe ? <CheckCircleFilled /> : <CheckCircleOutlined />}
            loading={usefulSubmitting}
            disabled={ownPost}
            title={ownPost ? '不能给自己的甄客帖标记有用' : undefined}
            onClick={async () => {
              if (!requireLogin()) return;
              if (ownPost) return;
              if (usefulSubmitting) return;
              setUsefulSubmitting(true);
              try {
                const result = await toggleUseful(postId);
                setDetail((current) => current ? { ...current, usefulByMe: result.usefulByMe, usefulCount: result.usefulCount } : current);
              } catch (reason) {
                message.error(reason instanceof Error ? reason.message : '“有用”状态更新失败');
              } finally {
                setUsefulSubmitting(false);
              }
            }}
          >{ownPost ? '自己的内容' : detail.usefulByMe ? '已觉得有用' : '觉得有用'}</Button>
          <span className={styles.usefulCountCopy}>{detail.usefulCount} 人觉得有用</span>
          <Button icon={<MessageOutlined />} onClick={() => document.getElementById('post-comments')?.scrollIntoView({ behavior: 'smooth' })}>
            评论 {detail.commentCount}
          </Button>
          <Button icon={<ShareAltOutlined />} onClick={() => void share()}>分享</Button>
          {user?.id === detail.shopUserId && (
            <Popconfirm
              title="删除后正文、媒体和历史分享链接均不可见，确认删除？"
              onConfirm={async () => {
                try {
                  await removePost(postId);
                  message.success('甄客帖已删除');
                  navigate('/profile/posts');
                } catch (reason) {
                  message.error(reason instanceof Error ? reason.message : '帖子删除失败');
                }
              }}
            >
              <Button danger>删除帖子</Button>
            </Popconfirm>
          )}
        </div>
      </article>

      <section className={`${styles.surface} ${styles.placePanel}`}>
        <div className={styles.placePanelCopy}>
          <strong><EnvironmentOutlined /> 发布者选择的地点：{detail.placeName}</strong>
          <p>{detail.placeAddress}</p>
        </div>
        <Button type="primary" onClick={() => navigate(`/places/${detail.placeId}`)}>地点详情 / 导航</Button>
      </section>

      {detail.merchantId && (
        <section className={`${styles.surface} ${styles.merchantPanel}`}>
          <div className={styles.placePanelCopy}>
            <strong><ShopOutlined /> 用户主动关联商家：{detail.merchantName}</strong>
          </div>
          <Button onClick={() => navigate(`/merchants/${detail.merchantId}`)}>查看入驻商家</Button>
        </section>
      )}

      <section id="post-comments" className={`${styles.surface} ${styles.commentsPanel}`}>
        <div className={styles.sectionTitle}>
          <div><h2>评论与回复</h2></div>
        </div>
        {renderCommentComposer()}
        {commentsLoading && commentRows.length === 0 && (
          <ZkState kind="loading" title="正在加载评论" />
        )}
        {commentsError && (
          <ZkState
            kind="error"
            title="评论暂时无法加载"
            description={commentsError}
            actionText="重试"
            onAction={() => void loadComments(commentRows.length > 0 ? commentPage + 1 : 1, commentRows.length > 0)}
          />
        )}
        {!commentsLoading && !commentsError && commentRows.length === 0 ? (
          <ZkState title="还没有评论" description="说说你对这篇分享或这个地点的看法。" />
        ) : commentRows.map((root) => {
          const shownReplies = root.replies ?? [];
          const replyPage = replyPages[root.commentId] ?? 0;
          const remainingReplies = Math.max(0, (root.replyCount ?? 0) - shownReplies.length);
          return (
            <div key={root.commentId} className={styles.commentThread}>
              {renderComment(root)}
              {shownReplies.map((reply) => renderComment(reply, true))}
              {replyErrors[root.commentId] && (
                <div className={styles.replyPager}>
                  <Button
                    type="link"
                    danger
                    onClick={() => void loadReplies(root.commentId, replyPage > 0 ? replyPage + 1 : 1)}
                  >回复加载失败，重新加载</Button>
                </div>
              )}
              {!replyErrors[root.commentId] && remainingReplies > 0 && (
                <div className={styles.replyPager}>
                  <Button
                    type="link"
                    loading={replyLoading[root.commentId]}
                    onClick={() => void loadReplies(root.commentId, replyPage > 0 ? replyPage + 1 : 1)}
                  >{replyPage > 0 ? `查看更多回复（还剩 ${remainingReplies} 条）` : `展开其余 ${remainingReplies} 条回复`}</Button>
                </div>
              )}
            </div>
          );
        })}
        {commentRows.length < commentTotal && (
          <div className={styles.commentPager}>
            <Button loading={commentsLoading} onClick={() => void loadComments(commentPage + 1, true)}>
              查看更多评论（还剩 {commentTotal - commentRows.length} 条）
            </Button>
          </div>
        )}
      </section>
      </main>
      <WechatShareGuide open={wechatShareGuide.open} onClose={wechatShareGuide.close} />
    </>
  );
}
