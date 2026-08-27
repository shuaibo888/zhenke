import {
  EnvironmentOutlined,
  LikeOutlined,
  MessageOutlined,
  PlayCircleFilled,
} from '@ant-design/icons';
import { useNavigate } from 'umi';
import type { ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

export const perspectiveNames: Record<ZhenkePost['perspective'], string> = {
  LOCAL: '本地土著',
  TOURIST: '外地游客',
  HOMETOWNER: '在外家乡人',
};

function AuthorAvatar({ post }: { post: ZhenkePost }) {
  return (
    <span className={styles.authorAvatar}>
      {post.avatar
        ? <img src={post.avatar} alt="" />
        : (post.nickName || post.userName || '甄').slice(0, 1)}
    </span>
  );
}

export function ZhenkePostCard({ post, disabled = false }: { post: ZhenkePost; disabled?: boolean }) {
  const navigate = useNavigate();
  const cover = post.resources?.[0];
  const authorName = post.nickName || post.userName || '甄客行用户';

  return (
    <article
      className={`${styles.postCard} ${disabled ? styles.postCardDisabled : ''}`}
      tabIndex={disabled ? undefined : 0}
      role={disabled ? undefined : 'link'}
      aria-label={disabled ? `已删除的甄客帖：${post.title}` : `查看甄客帖：${post.title}`}
      onClick={disabled ? undefined : () => navigate(`/posts/${post.postId}`)}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) navigate(`/posts/${post.postId}`);
      }}
    >
      <div className={styles.postMedia}>
        {cover?.resourceType === 'VIDEO' ? (
          <>
            <video src={cover.resourceUrl} muted playsInline preload="metadata" />
            <span className={styles.videoBadge}><PlayCircleFilled /></span>
          </>
        ) : cover ? (
          <img src={cover.resourceUrl} alt={post.title} loading="lazy" decoding="async" />
        ) : (
          <span>城市日常</span>
        )}
        <span className={styles.contentBadge}>甄客帖</span>
      </div>

      <div className={styles.postBody}>
        <div className={styles.authorRow}>
          <AuthorAvatar post={post} />
          <span className={styles.authorCopy}>
            <strong>{authorName}</strong>
            <small>{perspectiveNames[post.perspective]}</small>
          </span>
        </div>
        <h3>{post.title}</h3>
        <p className={styles.postExcerpt}>{post.content}</p>
        <footer className={styles.postMeta}>
          <span className={styles.postPlace}><EnvironmentOutlined />{post.placeName}</span>
          <span><MessageOutlined />{post.commentCount ?? 0}</span>
          <span><LikeOutlined />{post.usefulCount ?? 0}</span>
        </footer>
      </div>
    </article>
  );
}
