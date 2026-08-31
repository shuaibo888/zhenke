import { EditOutlined, EnvironmentOutlined, ReadOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'umi';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkPageHeader, ZkState } from '@/components/ZkPage';
import { posts, type ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

const PAGE_SIZE = 12;
const perspectives = [
  { value: 'LOCAL', label: '本地土著' },
  { value: 'TOURIST', label: '外地游客' },
  { value: 'HOMETOWNER', label: '在外家乡人' },
] as const;

type PerspectiveFilter = typeof perspectives[number]['value'];

export default function PostListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPerspective = searchParams.get('perspective')?.toUpperCase();
  const perspective: PerspectiveFilter = perspectives.some((item) => item.value === requestedPerspective)
    ? requestedPerspective as PerspectiveFilter
    : 'LOCAL';
  const [rows, setRows] = useState<ZhenkePost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestVersionRef = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setLoadingMore(false);
    setError('');
    try {
      const result = await posts(perspective, 1, PAGE_SIZE);
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
    void loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
  }, []);

  const loadMore = async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await posts(perspective, nextPage, PAGE_SIZE);
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

  return (
    <main className={styles.page}>
      <ZkPageHeader
        eyebrow={<><ReadOutlined /> 城市生活 · 真实分享</>}
        title="甄客帖"
        description="从不同身份出发，发现城市里的好去处与真实体验。"
        action={<Button type="primary" size="large" icon={<EditOutlined />} onClick={() => navigate('/posts/publish')}>发布甄客帖</Button>}
      />

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
              next.delete('zone');
              setSearchParams(next);
            }}
          >
            {item.label}
          </button>
        ))}
        </div>
        <p className={styles.identityContextHint}>
          <EnvironmentOutlined /> 身份以发布时选择地点所在城市为参照；内容范围按平台当前城市展示规则执行。
        </p>
      </div>

      {loading ? (
        <ZkState kind="loading" title="正在加载甄客帖" />
      ) : error ? (
        <ZkState kind="error" title="暂时无法打开帖子流" description={error} onAction={() => void loadFirstPage()} />
      ) : rows.length === 0 ? (
        <ZkState
          title={`还没有${perspectives.find((item) => item.value === perspective)?.label}的分享`}
          description="来记录一次值得分享的到访吧。"
          actionText="去发布"
          onAction={() => navigate('/posts/publish')}
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
    </main>
  );
}
