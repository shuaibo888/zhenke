import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  LikeOutlined,
  MessageOutlined,
  SendOutlined,
  ShareAltOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Button, Input, Popconfirm, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { perspectiveNames } from '@/components/ZhenkePostCard';
import { ZkState } from '@/components/ZkPage';
import {
  comments,
  createComment,
  deleteComment,
  post,
  removePost,
  toggleUseful,
  type PostComment,
  type ZhenkePost,
} from '@/services/zhenke';
import { isWechatBrowser, useWechatShare } from '@/hooks/useWechatShare';
import { buildLoginPath } from '@/utils/safeRedirect';
import styles from '@/styles/zhenke.less';

export default function PostDetailPage() {
  const { postId: rawPostId } = useParams<{ postId: string }>();
  const postId = Number(rawPostId);
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const { user } = useShop();
  const [detail, setDetail] = useState<ZhenkePost>();
  const [commentRows, setCommentRows] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<PostComment>();
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [usefulSubmitting, setUsefulSubmitting] = useState(false);
  const sharePreviewImage = detail?.resources.find((item) => item.resourceType === 'IMAGE')?.resourceUrl ?? '';
  const prepareWechatShare = useWechatShare(detail && sharePreviewImage ? {
    title: `甄客帖｜${detail.title}`,
    description: `${detail.nickName || detail.userName || '甄客行用户'}：${detail.content.slice(0, 60)}`,
    link: `/posts/${detail.postId}`,
    imageUrl: sharePreviewImage,
  } : null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [postResult, commentResult] = await Promise.allSettled([post(postId), comments(postId)]);
      if (postResult.status === 'fulfilled') {
        setDetail(postResult.value);
      } else {
        setDetail(undefined);
        setError(postResult.reason instanceof Error ? postResult.reason.message : '甄客帖不存在或已删除');
      }
      if (commentResult.status === 'fulfilled') {
        setCommentRows(commentResult.value);
      } else {
        setCommentRows([]);
        message.error(commentResult.reason instanceof Error ? commentResult.reason.message : '评论暂时无法加载');
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (Number.isSafeInteger(postId) && postId > 0) void load();
    else {
      setLoading(false);
      setError('甄客帖链接无效');
    }
  }, [load, postId]);

  const rootComments = useMemo(
    () => commentRows.filter((item) => !item.parentCommentId),
    [commentRows],
  );
  const repliesByRoot = useMemo(() => {
    const result = new Map<number, PostComment[]>();
    commentRows.filter((item) => item.parentCommentId).forEach((item) => {
      const list = result.get(item.parentCommentId!) ?? [];
      list.push(item);
      result.set(item.parentCommentId!, list);
    });
    return result;
  }, [commentRows]);

  const requireLogin = () => {
    if (user) return true;
    message.info('登录后可评论、回复和标记有用');
    navigate(buildLoginPath(`${routeLocation.pathname}${routeLocation.search}${routeLocation.hash}`));
    return false;
  };

  const submitComment = async () => {
    if (!requireLogin() || !commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      await createComment(postId, commentText.trim(), replyTarget?.commentId);
      setCommentText('');
      setReplyTarget(undefined);
      await load();
      message.success(replyTarget ? '回复已发布' : '评论已发布');
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '评论发布失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const share = async () => {
    if (!detail) return;
    const shareData = {
      title: detail.title,
      text: detail.content.slice(0, 100),
      url: window.location.href,
    };
    try {
      if (isWechatBrowser() && sharePreviewImage) {
        await prepareWechatShare();
        message.info('分享卡片已准备，请点击微信右上角发送给朋友或分享到朋友圈');
        return;
      }
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        message.success('分享链接已复制');
      }
    } catch (reason) {
      if ((reason as DOMException)?.name !== 'AbortError') message.warning('暂时无法分享，请复制浏览器地址');
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

  const renderComment = (comment: PostComment, reply = false) => (
    <article key={comment.commentId} className={`${styles.commentItem} ${reply ? styles.replyItem : ''}`}>
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
          <Button size="small" type="text" onClick={() => {
            if (!requireLogin()) return;
            setReplyTarget(comment);
          }}>回复</Button>
          {user?.id === comment.shopUserId && (
            <Popconfirm
              title={reply ? '确认删除这条回复？' : '确认删除评论及其全部回复？'}
              onConfirm={async () => {
                try {
                  await deleteComment(postId, comment.commentId);
                  await load();
                  message.success(reply ? '回复已删除' : '评论已删除');
                } catch (reason) {
                  message.error(reason instanceof Error ? reason.message : '评论删除失败');
                }
              }}
            >
              <Button size="small" type="text" danger>删除</Button>
            </Popconfirm>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <main className={`${styles.page} ${styles.detailPage}`}>
      <div className={styles.detailTopbar}>
        <button type="button" className={styles.backButton} aria-label="返回" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined />
        </button>
        <div className={styles.authorRow}>
          <span className={styles.authorAvatar}>{detail.avatar ? <img src={detail.avatar} alt="" /> : authorInitial}</span>
          <span className={styles.authorCopy}>
            <strong>{authorName}</strong>
            <small>{perspectiveNames[detail.perspective]} · {detail.publishedAt}</small>
          </span>
        </div>
        <Button shape="circle" icon={<ShareAltOutlined />} aria-label="分享" onClick={() => void share()} />
      </div>

      <div className={styles.detailGallery}>
        {detail.resources.map((resource) => resource.resourceType === 'VIDEO' ? (
          <video key={resource.resourceId ?? resource.resourceUrl} controls playsInline preload="metadata" src={resource.resourceUrl} />
        ) : (
          <img key={resource.resourceId ?? resource.resourceUrl} src={resource.resourceUrl} alt={detail.title} />
        ))}
      </div>

      <article className={`${styles.surface} ${styles.detailContent}`}>
        <span className={styles.eyebrow}>甄客帖 · 发布者主动分享</span>
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
            icon={<LikeOutlined />}
            loading={usefulSubmitting}
            onClick={async () => {
              if (!requireLogin()) return;
              if (usefulSubmitting) return;
              setUsefulSubmitting(true);
              try {
                const result = await toggleUseful(postId);
                setDetail((current) => current ? { ...current, usefulByMe: result.useful, usefulCount: result.usefulCount } : current);
              } catch (reason) {
                message.error(reason instanceof Error ? reason.message : '“有用”状态更新失败');
              } finally {
                setUsefulSubmitting(false);
              }
            }}
          >有用 {detail.usefulCount}</Button>
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
          <p>地点关联是发布者声明，不代表平台核验到访或正文与地点一致。</p>
        </div>
        <Button type="primary" onClick={() => navigate(`/places/${detail.placeId}`)}>地点详情 / 导航</Button>
      </section>

      {detail.merchantId && (
        <section className={`${styles.surface} ${styles.merchantPanel}`}>
          <div className={styles.placePanelCopy}>
            <strong><ShopOutlined /> 用户主动关联商家：{detail.merchantName}</strong>
            <p>关联不代表商家确认、平台核验或已消费认证。</p>
          </div>
          <Button onClick={() => navigate(`/merchants/${detail.merchantId}`)}>查看入驻商家</Button>
        </section>
      )}

      <section id="post-comments" className={`${styles.surface} ${styles.commentsPanel}`}>
        <div className={styles.sectionTitle}>
          <div><h2>评论与回复</h2><p>{commentRows.length} 条公开交流</p></div>
        </div>
        <div className={styles.commentComposer}>
          {replyTarget && (
            <div className={styles.contextNotice}>
              正在回复 {replyTarget.nickName || replyTarget.userName}
              <Button type="link" size="small" onClick={() => setReplyTarget(undefined)}>取消回复</Button>
            </div>
          )}
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            value={commentText}
            placeholder={user ? '友善交流，补充更多地点信息' : '登录后参与评论与回复'}
            onFocus={() => requireLogin()}
            onChange={(event) => setCommentText(event.target.value)}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={commentSubmitting}
            disabled={!commentText.trim()}
            onClick={() => void submitComment()}
          >{replyTarget ? '发布回复' : '发表评论'}</Button>
        </div>
        {rootComments.length === 0 ? (
          <ZkState title="还没有评论" description="说说你对这篇分享或这个地点的看法。" />
        ) : rootComments.map((root) => (
          <div key={root.commentId}>
            {renderComment(root)}
            {(repliesByRoot.get(root.commentId) ?? []).map((reply) => renderComment(reply, true))}
          </div>
        ))}
      </section>
    </main>
  );
}
