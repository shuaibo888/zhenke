import { CoffeeOutlined, CompassOutlined, HomeOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'umi';
import { ZhenkeEnjoyCard } from '@/components/ZhenkeEnjoyCard';
import { ZkState } from '@/components/ZkPage';
import { enjoys, type EnjoyCategory, type ZhenkeEnjoy } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { CURRENT_LOCATION_CHANGED_EVENT } from '@/utils/currentLocation';
import pageStyles from './index.module.less';

const categories: Array<{ value: EnjoyCategory; label: string; caption: string; icon: React.ReactNode }> = [
  { value: 'SCENIC', label: '甄必玩', caption: '城市里值得去的地方', icon: <CompassOutlined /> },
  { value: 'RESTAURANT', label: '甄必吃', caption: '值得专程去吃的味道', icon: <CoffeeOutlined /> },
  { value: 'HOTEL', label: '甄必住', caption: '安心舒适的住宿体验', icon: <HomeOutlined /> },
  { value: 'MALL', label: '甄必购', caption: '好物与城市手信', icon: <ShoppingOutlined /> },
];

export default function EnjoyListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeCategory = useMemo<EnjoyCategory>(() => {
    const value = new URLSearchParams(location.search).get('category') as EnjoyCategory | null;
    return categories.some((item) => item.value === value) ? value! : 'SCENIC';
  }, [location.search]);
  const [rows, setRows] = useState<ZhenkeEnjoy[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');
  const requestVersionRef = useRef(0);

  const load = useCallback(async (nextPage = 1) => {
    const requestVersion = ++requestVersionRef.current;
    if (nextPage === 1) {
      setLoading(true);
      setLoadingMore(false);
      setError('');
    } else {
      setLoadingMore(true);
    }
    setLoadMoreError('');
    try {
      const result = await enjoys(activeCategory, nextPage, 12);
      if (requestVersion !== requestVersionRef.current) return;
      setRows((current) => {
        if (nextPage === 1) return result.rows;
        const ids = new Set(current.map((item) => item.enjoyId));
        return [...current, ...result.rows.filter((item) => !ids.has(item.enjoyId))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      const message = reason instanceof Error ? reason.message : '甄必享内容加载失败';
      if (nextPage === 1) {
        setRows([]);
        setError(message);
      } else {
        setLoadMoreError(message);
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeCategory]);

  useEffect(() => { void load(1); }, [load]);

  useEffect(() => {
    const refreshForCurrentCity = () => void load(1);
    window.addEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshForCurrentCity);
    return () => window.removeEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshForCurrentCity);
  }, [load]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
  }, []);

  const activeMeta = categories.find((item) => item.value === activeCategory)!;

  return (
    <main className={`${styles.page} ${pageStyles.page}`}>
      <header className={pageStyles.intro}>
        <span className={pageStyles.introMark} aria-hidden="true">甄</span>
        <div className={pageStyles.introCopy}>
          <span className={pageStyles.kicker}>甄客行官方精选</span>
          <h1>甄必享</h1>
          <p>首页展示每类最新精选，这里按玩、吃、住、购浏览全部内容。</p>
        </div>
      </header>
      <nav className={pageStyles.categoryTabs} aria-label="甄必享分类">
        {categories.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-current={activeCategory === item.value ? 'page' : undefined}
            className={activeCategory === item.value ? pageStyles.categoryTabActive : undefined}
            onClick={() => navigate(`/enjoy?category=${item.value}`)}
          >
            <span className={pageStyles.categoryIcon}>{item.icon}</span>
            <span className={pageStyles.categoryCopy}>
              <strong>{item.label}</strong>
              <small>{item.caption}</small>
            </span>
          </button>
        ))}
      </nav>
      <section className={pageStyles.listSection} aria-labelledby="active-enjoy-category">
        <header className={pageStyles.listHeader}>
          <div>
            <span className={pageStyles.activeIcon} aria-hidden="true">{activeMeta.icon}</span>
            <div>
              <h2 id="active-enjoy-category">{activeMeta.label}</h2>
              <p>{activeMeta.caption}</p>
            </div>
          </div>
          {!loading && !error && <span className={pageStyles.total}>{total} 篇精选</span>}
        </header>
        {loading ? (
          <ZkState kind="loading" title="正在加载本期精选" />
        ) : error ? (
          <ZkState kind="error" title="甄必享暂时没有连接成功" description={error} onAction={() => void load(1)} />
        ) : rows.length > 0 ? (
          <>
            <div className={styles.enjoyEditorialGrid}>{rows.map((item) => <ZhenkeEnjoyCard key={item.enjoyId} item={item} />)}</div>
            {rows.length < total && (
              <Button
                block
                className={pageStyles.loadMore}
                danger={Boolean(loadMoreError)}
                loading={loadingMore}
                title={loadMoreError || undefined}
                onClick={() => void load(page + 1)}
              >
                {loadMoreError ? '更多内容加载失败，点击重试' : '加载更多'}
              </Button>
            )}
          </>
        ) : (
          <ZkState title={`${activeMeta.label}正在准备`} description="平台运营团队正在整理本期精选内容。" />
        )}
      </section>
    </main>
  );
}
