import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'umi';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import { place, posts, type Place, type ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { openPlaceNavigation } from '@/utils/merchantNavigation';

export default function PlaceDetailPage() {
  const { placeId: rawPlaceId } = useParams<{ placeId: string }>();
  const placeId = Number(rawPlaceId);
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Place>();
  const [feed, setFeed] = useState<ZhenkePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedError, setFeedError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setFeedError('');
    try {
      const [placeResult, postResult] = await Promise.allSettled([
        place(placeId),
        posts('RECOMMEND', 1, 20, placeId),
      ]);
      if (placeResult.status === 'fulfilled') {
        setDetail(placeResult.value);
      } else {
        setDetail(undefined);
        setError(placeResult.reason instanceof Error ? placeResult.reason.message : '地点不存在或已停用');
      }
      if (postResult.status === 'fulfilled') {
        setFeed(postResult.value.rows);
      } else {
        setFeed([]);
        setFeedError(postResult.reason instanceof Error ? postResult.reason.message : '地点关联帖子暂时无法加载');
      }
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    if (Number.isSafeInteger(placeId) && placeId > 0) void load();
    else {
      setLoading(false);
      setError('地点链接无效');
    }
  }, [load, placeId]);

  if (loading) return <main className={styles.page}><ZkState kind="loading" title="正在打开地点" /></main>;
  if (!detail || error) {
    return (
      <main className={styles.page}>
        <ZkState
          kind="error"
          title="这个地点暂时不可用"
          description={error}
          actionText={Number.isSafeInteger(placeId) && placeId > 0 ? '重新加载' : '返回甄客帖'}
          onAction={Number.isSafeInteger(placeId) && placeId > 0 ? () => void load() : () => navigate('/posts')}
        />
        {Number.isSafeInteger(placeId) && placeId > 0 && <Button block onClick={() => navigate('/posts')}>返回甄客帖</Button>}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.detailTopbar}>
        <button type="button" className={styles.backButton} onClick={() => navigate(-1)} aria-label="返回">
          <ArrowLeftOutlined />
        </button>
        <strong>地点详情</strong>
      </div>

      <section className={`${styles.placeHero} ${styles.surface}`}>
        <span className={styles.locationLabel}><EnvironmentOutlined /> 地图服务公开地点</span>
        <h1>{detail.placeName}</h1>
        <p>{detail.address}</p>
        <div className={styles.placeFacts}>
          {[...new Set([detail.province, detail.city, detail.district, detail.placeType].filter(Boolean))]
            .map((item) => <span key={item}>{item}</span>)}
        </div>
        <div className={styles.heroActions}>
          <Button
            type="primary"
            size="large"
            icon={<CompassOutlined />}
            onClick={() => void openPlaceNavigation(detail.placeId, {
              latitude: detail.latitude,
              longitude: detail.longitude,
              name: detail.placeName,
              address: detail.address,
            }).catch((reason) => message.error(reason instanceof Error ? reason.message : '暂时无法打开导航'))}
          >
            用腾讯地图导航
          </Button>
        </div>
      </section>

      <div className={styles.contextNotice}>
        <InfoCircleOutlined />
        地点是发布者从地图服务中主动选择的信息。平台不公开发布者实时位置或距离，也不把地点关联表述为到访认证。
      </div>

      <ZkSectionTitle
        title="这个地点的甄客帖"
        description="按公开时间展示与地点关联的全平台帖子，不按你当前所在城市过滤。"
      />
      {feedError ? (
        <ZkState
          kind="error"
          title="地点信息可用，关联帖子暂未加载"
          description={feedError}
          onAction={() => void load()}
        />
      ) : feed.length > 0 ? (
        <div className={styles.postGrid}>{feed.map((item) => <ZhenkePostCard key={item.postId} post={item} />)}</div>
      ) : (
        <ZkState
          title="这里还没有公开帖子"
          description="如果你熟悉这个地点，可以围绕它分享第一篇甄客帖。"
          actionText="围绕此地发布"
          onAction={() => navigate('/posts/publish')}
        />
      )}
    </main>
  );
}
