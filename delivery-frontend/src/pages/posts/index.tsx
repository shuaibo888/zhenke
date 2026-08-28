import { EditOutlined, ReadOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkPageHeader, ZkState } from '@/components/ZkPage';
import { posts, type ZhenkePost } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

const PAGE_SIZE = 12;
const zones = [
  { value: 'RECOMMEND', label: '推荐' },
  { value: 'LOCAL', label: '本地专区' },
  { value: 'OUTSIDE', label: '外地专区' },
] as const;

type Zone = typeof zones[number]['value'];

export default function PostListPage() {
  const navigate = useNavigate();
  const [zone, setZone] = useState<Zone>('RECOMMEND');
  const [rows, setRows] = useState<ZhenkePost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await posts(zone, 1, PAGE_SIZE);
      setRows(result.rows);
      setTotal(result.total);
      setPage(1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '甄客帖加载失败');
    } finally {
      setLoading(false);
    }
  }, [zone]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await posts(zone, nextPage, PAGE_SIZE);
      setRows((current) => {
        const ids = new Set(current.map((item) => item.postId));
        return [...current, ...result.rows.filter((item) => !ids.has(item.postId))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '更多甄客帖加载失败');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className={styles.page}>
      <ZkPageHeader
        eyebrow={<><ReadOutlined /> 城市生活 · 真实分享</>}
        title="甄客帖"
        description="发现城市里的好去处与真实体验。"
        action={<Button type="primary" size="large" icon={<EditOutlined />} onClick={() => navigate('/posts/publish')}>发布甄客帖</Button>}
      />

      <div className={styles.zoneTabs} role="tablist" aria-label="甄客帖内容分区">
        {zones.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={zone === item.value}
            className={`${styles.zoneTab} ${zone === item.value ? styles.zoneActive : ''}`}
            onClick={() => setZone(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <ZkState kind="loading" title="正在加载甄客帖" />
      ) : error ? (
        <ZkState kind="error" title="暂时无法打开帖子流" description={error} onAction={() => void loadFirstPage()} />
      ) : rows.length === 0 ? (
        <ZkState
          title="这个专区还没有内容"
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
