import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'umi';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { usePostPublishLauncher } from '@/components/PostPublishLauncher';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import { useSafeBack } from '@/hooks/useSafeBack';
import { place, posts, type Place, type ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { openPlaceNavigation } from '@/utils/merchantNavigation';

const POST_PAGE_SIZE = 20;

export default function PlaceDetailPage() {
  const { placeId: rawPlaceId } = useParams<{ placeId: string }>();
  const placeId = Number(rawPlaceId);
  const navigate = useNavigate();
  const goBack = useSafeBack('/posts');
  const { startPostPublish } = usePostPublishLauncher();
  const [detail, setDetail] = useState<Place>();
  const [feed, setFeed] = useState<ZhenkePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedError, setFeedError] = useState('');
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedLoadMoreError, setFeedLoadMoreError] = useState('');
  const requestVersionRef = useRef(0);

  const load = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setError('');
    setFeedError('');
    setFeedLoadMoreError('');
    setFeedLoadingMore(false);
    try {
      const [placeResult, postResult] = await Promise.allSettled([
        place(placeId),
        posts('RECOMMEND', 1, POST_PAGE_SIZE, placeId),
      ]);
      if (requestVersion !== requestVersionRef.current) return;
      if (placeResult.status === 'fulfilled') {
        setDetail(placeResult.value);
      } else {
        setDetail(undefined);
        setError(placeResult.reason instanceof Error ? placeResult.reason.message : '地点不存在或已停用');
      }
      if (postResult.status === 'fulfilled') {
        setFeed(postResult.value.rows);
        setFeedTotal(postResult.value.total);
        setFeedPage(1);
      } else {
        setFeed([]);
        setFeedTotal(0);
        setFeedPage(1);
        setFeedError(postResult.reason instanceof Error ? postResult.reason.message : '地点关联帖子暂时无法加载');
      }
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    if (Number.isSafeInteger(placeId) && placeId > 0) void load();
    else {
      setLoading(false);
      setError('地点链接无效');
    }
  }, [load, placeId]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
  }, []);

  const loadMoreFeed = async () => {
    const requestVersion = ++requestVersionRef.current;
    const nextPage = feedPage + 1;
    setFeedLoadingMore(true);
    setFeedLoadMoreError('');
    try {
      const result = await posts('RECOMMEND', nextPage, POST_PAGE_SIZE, placeId);
      if (requestVersion !== requestVersionRef.current) return;
      setFeed((current) => {
        const ids = new Set(current.map((item) => item.postId));
        return [...current, ...result.rows.filter((item) => !ids.has(item.postId))];
      });
      setFeedTotal(result.total);
      setFeedPage(nextPage);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setFeedLoadMoreError(reason instanceof Error ? reason.message : '更多地点帖子加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setFeedLoadingMore(false);
    }
  };

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
        <button type="button" className={styles.backButton} onClick={goBack} aria-label="返回">
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

      <ZkSectionTitle
        title="这个地点的甄客帖"
        description="看看大家围绕这里分享的体验。"
        action={<Button type="link" onClick={() => startPostPublish({ placeId: detail.placeId })}>围绕此地发布</Button>}
      />
      {feedError ? (
        <ZkState
          kind="error"
          title="地点信息可用，关联帖子暂未加载"
          description={feedError}
          onAction={() => void load()}
        />
      ) : feed.length > 0 ? (
        <>
          <div className={styles.postGrid}>{feed.map((item) => <ZhenkePostCard key={item.postId} post={item} />)}</div>
          {feed.length < feedTotal && (
            <div className={styles.loadMore}>
              <Button
                danger={Boolean(feedLoadMoreError)}
                loading={feedLoadingMore}
                title={feedLoadMoreError || undefined}
                onClick={() => void loadMoreFeed()}
              >
                {feedLoadMoreError ? '更多帖子加载失败，点击重试' : '加载更多地点帖子'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <ZkState
          title="这里还没有公开帖子"
          description="如果你熟悉这个地点，可以围绕它分享第一篇甄客帖。"
          actionText="围绕此地发布"
          onAction={() => startPostPublish({ placeId: detail.placeId })}
        />
      )}
    </main>
  );
}
