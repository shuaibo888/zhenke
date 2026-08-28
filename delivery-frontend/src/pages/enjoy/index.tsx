import { CoffeeOutlined, CompassOutlined, HomeOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'umi';
import { ZhenkeEnjoyCard } from '@/components/ZhenkeEnjoyCard';
import { ZkState } from '@/components/ZkPage';
import { enjoys, type EnjoyCategory, type ZhenkeEnjoy } from '@/services/zhenke';
import styles from '@/styles/zhenke.less';

const categories: Array<{ value: EnjoyCategory; label: string; caption: string; icon: React.ReactNode }> = [
  { value: 'MALL', label: '甄必购', caption: '好物与城市手信', icon: <ShoppingOutlined /> },
  { value: 'RESTAURANT', label: '甄必吃', caption: '值得专程去吃的味道', icon: <CoffeeOutlined /> },
  { value: 'SCENIC', label: '甄必玩', caption: '城市里值得去的地方', icon: <CompassOutlined /> },
  { value: 'HOTEL', label: '甄必住', caption: '安心舒适的住宿体验', icon: <HomeOutlined /> },
];

export default function EnjoyListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeCategory = useMemo<EnjoyCategory>(() => {
    const value = new URLSearchParams(location.search).get('category') as EnjoyCategory | null;
    return categories.some((item) => item.value === value) ? value! : 'MALL';
  }, [location.search]);
  const [rows, setRows] = useState<ZhenkeEnjoy[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextPage = 1) => {
    nextPage === 1 ? setLoading(true) : setLoadingMore(true);
    setError('');
    try {
      const result = await enjoys(activeCategory, nextPage, 12);
      setRows((current) => nextPage === 1 ? result.rows : [...current, ...result.rows]);
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      if (nextPage === 1) setRows([]);
      setError(reason instanceof Error ? reason.message : '甄必享内容加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeCategory]);

  useEffect(() => { void load(1); }, [load]);

  const activeMeta = categories.find((item) => item.value === activeCategory)!;

  return (
    <main className={`${styles.page} ${styles.enjoyPage}`}>
      <header className={styles.enjoyPageHero}>
        <span>ZHEN PICKS</span>
        <h1>甄必享</h1>
        <p>由甄客行运营团队整理和发布的城市生活精选。</p>
      </header>
      <nav className={styles.enjoyCategoryTabs} aria-label="甄必享分类">
        {categories.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-current={activeCategory === item.value ? 'page' : undefined}
            className={activeCategory === item.value ? styles.enjoyCategoryTabActive : ''}
            onClick={() => navigate(`/enjoy?category=${item.value}`)}
          >
            <span>{item.icon}</span><strong>{item.label}</strong><small>{item.caption}</small>
          </button>
        ))}
      </nav>
      <section className={styles.enjoyListSection}>
        <div className={styles.sectionTitle}>
          <div><h2>{activeMeta.label}</h2><p>{activeMeta.caption}</p></div>
        </div>
        {loading ? (
          <ZkState kind="loading" title="正在加载本期精选" />
        ) : error ? (
          <ZkState kind="error" title="甄必享暂时没有连接成功" description={error} onAction={() => void load(1)} />
        ) : rows.length > 0 ? (
          <>
            <div className={styles.enjoyEditorialGrid}>{rows.map((item) => <ZhenkeEnjoyCard key={item.enjoyId} item={item} />)}</div>
            {rows.length < total && <Button block loading={loadingMore} onClick={() => void load(page + 1)}>加载更多</Button>}
          </>
        ) : (
          <ZkState title={`${activeMeta.label}正在准备`} description="平台运营团队正在整理本期精选内容。" />
        )}
      </section>
    </main>
  );
}
