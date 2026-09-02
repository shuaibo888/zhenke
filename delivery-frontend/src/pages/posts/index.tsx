import { EditOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'umi';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { usePostPublishLauncher } from '@/components/PostPublishLauncher';
import { ZkState } from '@/components/ZkPage';
import { postCities, posts, type ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { CURRENT_LOCATION_CHANGED_EVENT } from '@/utils/currentLocation';

const PAGE_SIZE = 12;
const perspectives = [
  { value: 'LOCAL', label: '本地土著' },
  { value: 'TOURIST', label: '外地游客' },
  { value: 'HOMETOWNER', label: '在外家乡人' },
] as const;

type PerspectiveFilter = typeof perspectives[number]['value'];

export default function PostListPage() {
  const { startPostPublish } = usePostPublishLauncher();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPerspective = searchParams.get('perspective')?.toUpperCase();
  const perspective: PerspectiveFilter = perspectives.some((item) => item.value === requestedPerspective)
    ? requestedPerspective as PerspectiveFilter
    : 'LOCAL';
  const [rows, setRows] = useState<ZhenkePost[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestVersionRef = useRef(0);

  const loadPerspective = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setLoadingMore(false);
    setError('');
    try {
      const availableCities = await postCities(perspective);
      if (requestVersion !== requestVersionRef.current) return;
      const requestedCity = new URLSearchParams(window.location.search).get('postCity')?.trim() || '';
      const activeCity = availableCities.includes(requestedCity) ? requestedCity : (availableCities[0] || '');
      setCities(availableCities);
      setSelectedCity(activeCity);
      if (!activeCity) {
        setRows([]);
        setTotal(0);
        setPage(1);
        return;
      }
      const result = await posts(perspective, 1, PAGE_SIZE, undefined, activeCity);
      if (requestVersion !== requestVersionRef.current) return;
      setRows(result.rows);
      setTotal(result.total);
      setPage(1);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(reason instanceof Error ? reason.message : '甄客帖加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [perspective]);

  useEffect(() => {
    void loadPerspective();
  }, [loadPerspective]);

  useEffect(() => {
    const refreshForCurrentCity = () => void loadPerspective();
    window.addEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshForCurrentCity);
    return () => window.removeEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshForCurrentCity);
  }, [loadPerspective]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
  }, []);

  const loadMore = async () => {
    if (!selectedCity) return;
    const requestVersion = ++requestVersionRef.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await posts(perspective, nextPage, PAGE_SIZE, undefined, selectedCity);
      if (requestVersion !== requestVersionRef.current) return;
      setRows((current) => {
        const ids = new Set(current.map((item) => item.postId));
        return [...current, ...result.rows.filter((item) => !ids.has(item.postId))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      message.error(reason instanceof Error ? reason.message : '更多甄客帖加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setLoadingMore(false);
    }
  };

  const chooseCity = async (city: string) => {
    if (city === selectedCity || loading) return;
    const requestVersion = ++requestVersionRef.current;
    setSelectedCity(city);
    setLoading(true);
    setLoadingMore(false);
    setError('');
    const next = new URLSearchParams(searchParams);
    next.set('postCity', city);
    setSearchParams(next, { replace: true });
    try {
      const result = await posts(perspective, 1, PAGE_SIZE, undefined, city);
      if (requestVersion !== requestVersionRef.current) return;
      setRows(result.rows);
      setTotal(result.total);
      setPage(1);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(reason instanceof Error ? reason.message : '甄客帖加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.postsPageHeading}>
        <div>
          <h1>甄客帖</h1>
        </div>
        <Button type="primary" size="large" icon={<EditOutlined />} onClick={() => startPostPublish()}>发布帖子</Button>
      </header>

      <div className={styles.identityFilterBlock}>
        <div className={styles.identityTabs} role="tablist" aria-label="按发布者与城市的关系筛选甄客帖">
        {perspectives.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={perspective === item.value}
            className={`${styles.identityTab} ${perspective === item.value ? styles.identityActive : ''}`}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (item.value === 'LOCAL') next.delete('perspective');
              else next.set('perspective', item.value);
              next.delete('postCity');
              setSearchParams(next);
            }}
          >
            {item.label}
          </button>
        ))}
        </div>
      </div>

      <div className={`${styles.postsBrowserLayout} ${cities.length === 0 ? styles.postsBrowserLayoutFullWidth : ''}`}>
        {cities.length > 0 && (
          <aside className={styles.postCityRail} aria-label="按已发布帖子的城市筛选">
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                className={city === selectedCity ? styles.postCityActive : ''}
                aria-pressed={city === selectedCity}
                title={city}
                onClick={() => void chooseCity(city)}
              >
                {city.replace(/市$/, '')}
              </button>
            ))}
          </aside>
        )}
        <section className={styles.postsBrowserContent} aria-live="polite">
          {loading ? (
            <ZkState kind="loading" title="正在加载甄客帖" />
          ) : error ? (
            <ZkState kind="error" title="暂时无法打开帖子流" description={error} onAction={() => void loadPerspective()} />
          ) : rows.length === 0 ? (
            <ZkState
              title={cities.length === 0
                ? `还没有${perspectives.find((item) => item.value === perspective)?.label}发布过甄客帖`
                : `${selectedCity}还没有这一视角的分享`}
              description="来记录一次值得分享的到访吧。"
              actionText="去发布"
              onAction={() => startPostPublish()}
            />
          ) : (
            <>
              <div className={styles.postGrid}>
                {rows.map((post) => <ZhenkePostCard key={post.postId} post={post} />)}
              </div>
              {rows.length < total && (
                <div className={styles.loadMore}>
                  <Button size="large" loading={loadingMore} onClick={() => void loadMore()}>加载更多</Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
