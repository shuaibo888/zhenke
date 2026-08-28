import { EnvironmentOutlined, HeartFilled, HeartOutlined, MessageOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';
import type { ZhenkeEnjoy } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

export const enjoyCategoryNames: Record<ZhenkeEnjoy['category'], string> = {
  MALL: '甄必购',
  RESTAURANT: '甄必吃',
  SCENIC: '甄必玩',
  HOTEL: '甄必住',
};

export function ZhenkeEnjoyCard({ item }: { item: ZhenkeEnjoy }) {
  const navigate = useNavigate();
  return (
    <article className={styles.enjoyEditorialCard}>
      <button
        type="button"
        className={styles.enjoyEditorialCover}
        onClick={() => navigate(`/enjoy/${item.enjoyId}`)}
        aria-label={`查看${item.title}`}
      >
        <img src={item.coverUrl} alt={item.title} loading="lazy" />
        <span>{enjoyCategoryNames[item.category]}</span>
        {(item.mediaCount ?? item.mediaUrls?.length ?? 1) > 1 && <em><PictureOutlined /> {item.mediaCount ?? item.mediaUrls?.length}</em>}
      </button>
      <div className={styles.enjoyEditorialCopy}>
        <button type="button" onClick={() => navigate(`/enjoy/${item.enjoyId}`)}>
          <strong>{item.title}</strong>
          <p>{item.serviceSummary || item.subtitle}</p>
        </button>
        {item.placeName && <small><EnvironmentOutlined /> {item.placeName}{item.placeAddress ? ` · ${item.placeAddress}` : ''}</small>}
        <footer>
          <span>{item.likedByMe ? <HeartFilled /> : <HeartOutlined />} {item.likeCount ?? 0}</span>
          <span><MessageOutlined /> {item.commentCount ?? 0}</span>
          <button type="button" onClick={() => navigate(`/enjoy/${item.enjoyId}`)}>查看详情 →</button>
        </footer>
      </div>
    </article>
  );
}
