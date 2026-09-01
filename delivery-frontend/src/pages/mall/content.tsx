import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'umi';
import { useShop } from '@/app/ShopContext';
import { HomeFeedReportCard } from '@/components/HomeFeedReportCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  fetchHomeFeed,
  toggleReportUseful,
  type HomeFeedItemDto,
} from '@/services/shopContent';
import { buildLoginPath } from '@/utils/safeRedirect';
import styles from '@/styles/zhenke.less';

const PAGE_SIZE = 12;

export default function MallContentPage() {
  const navigate = useNavigate();
  const { user } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedKeyword = searchParams.get('keyword') ?? '';
  const requestedContentType = searchParams.get('content')?.toUpperCase();
  const contentType = requestedContentType === 'TRIAL' || requestedContentType === 'REPORT'
    ? requestedContentType
    : 'ALL';
  const [keywordInput, setKeywordInput] = useState(requestedKeyword);
  const [keyword, setKeyword] = useState(requestedKeyword);
  const [feed, setFeed] = useState<HomeFeedItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestVersionRef = useRef(0);

  useEffect(() => {
    setKeywordInput(requestedKeyword);
    setKeyword(requestedKeyword);
  }, [requestedKeyword]);

  const loadFeed = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setLoadingMore(false);
    setError('');
    try {
      const result = await fetchHomeFeed({
        businessModule: 'MALL',
        keyword: keyword || undefined,
        contentType,
        trialType: 'ALL',
        pageNum: 1,
        pageSize: PAGE_SIZE,
      });
      if (requestVersion !== requestVersionRef.current) return;
      setFeed(result.rows);
      setTotal(result.total);
      setPage(1);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(reason instanceof Error ? reason.message : '试用与甄客验加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [contentType, keyword]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => () => {
    requestVersionRef.current += 1;
  }, []);

  const selectContent = (nextContentType: 'ALL' | 'TRIAL' | 'REPORT') => {
    const next = new URLSearchParams({ content: nextContentType });
    if (keyword) next.set('keyword', keyword);
    setSearchParams(next);
  };

  const submitSearch = () => {
    const normalized = keywordInput.trim();
    setKeywordInput(normalized);
    setKeyword(normalized);
    const next = new URLSearchParams({ content: contentType });
    if (normalized) next.set('keyword', normalized);
    setSearchParams(next);
  };

  const loadMore = async () => {
    const requestVersion = ++requestVersionRef.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchHomeFeed({
        businessModule: 'MALL',
        keyword: keyword || undefined,
        contentType,
        trialType: 'ALL',
        pageNum: nextPage,
        pageSize: PAGE_SIZE,
      });
      if (requestVersion !== requestVersionRef.current) return;
      setFeed((current) => {
        const keys = new Set(current.map((item) => `${item.contentType}-${item.contentId}`));
        return [...current, ...result.rows.filter((item) => !keys.has(`${item.contentType}-${item.contentId}`))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      if (requestVersion !== requestVersionRef.current) return;
      message.error(reason instanceof Error ? reason.message : '更多内容加载失败');
    } finally {
      if (requestVersion === requestVersionRef.current) setLoadingMore(false);
    }
  };

  const useful = async (item: HomeFeedItemDto) => {
    if (!item.report) return;
    if (!user) {
      message.info('登录后可以标记有用');
      navigate(buildLoginPath(`${window.location.pathname}${window.location.search}`));
      return;
    }
    if (item.report.shopUserId === user.id) {
      message.warning('不能给自己的甄客验标记有用');
      return;
    }
    try {
      const result = await toggleReportUseful(item.contentId);
      setFeed((items) => items.map((current) => (
        current.contentType === 'REPORT' && current.contentId === item.contentId && current.report
          ? { ...current, report: { ...current.report, ...result } }
          : current
      )));
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '操作失败');
    }
  };

  const heading = keyword
    ? `“${keyword}”的搜索结果`
    : contentType === 'TRIAL'
      ? '正在招募的试用'
      : contentType === 'REPORT'
        ? '消费者甄客验'
        : '全部试用与甄客验';

  return (
    <main className={styles.page}>
      <div className={styles.mallListToolbar}>
        <button type="button" className={styles.mallListBack} aria-label="返回商城" onClick={() => navigate('/mall')}>
          <ArrowLeftOutlined />
        </button>
        <form
          className={styles.mallSearch}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <SearchOutlined />
          <input
            type="search"
            maxLength={50}
            value={keywordInput}
            aria-label="搜索商城试用与甄客验"
            placeholder="搜索试用、甄客验或商家"
            onChange={(event) => setKeywordInput(event.target.value)}
          />
          <Button type="primary" htmlType="submit">搜索</Button>
        </form>
      </div>

      <nav className={styles.mallFeedFilters} aria-label="试用与甄客验筛选">
        {([
          ['ALL', '全部'],
          ['TRIAL', '试用'],
          ['REPORT', '甄客验'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-current={contentType === value ? 'page' : undefined}
            className={contentType === value ? styles.mallFeedFilterActive : ''}
            onClick={() => selectContent(value)}
          >{label}</button>
        ))}
      </nav>

      <ZkSectionTitle
        title={heading}
        description={loading ? '正在查询内容' : `共 ${total} 条`}
      />
      <section>
        {loading ? (
          <ZkState kind="loading" title="正在加载试用与甄客验" />
        ) : error ? (
          <ZkState kind="error" title="试用与甄客验暂时无法加载" description={error} onAction={() => void loadFeed()} />
        ) : feed.length === 0 ? (
          <ZkState
            title={keyword ? '没有找到相关内容' : contentType === 'TRIAL' ? '暂无正在招募的试用' : contentType === 'REPORT' ? '暂无甄客验' : '暂无试用或甄客验'}
            description={keyword ? '请尝试更换商品、商家或内容关键词。' : '有新内容发布后，会展示在这里。'}
            actionText={keyword ? '清空搜索' : undefined}
            onAction={keyword ? () => selectContent(contentType) : undefined}
          />
        ) : (
          <>
            <div className={`${styles.commerceFeedGrid} ${styles.mallFeedList}`}>
              {feed.map((item) => item.contentType === 'REPORT' ? (
                <HomeFeedReportCard
                  key={`report-${item.contentId}`}
                  item={item}
                  onOpen={() => navigate(`/reports/${item.contentId}`)}
                  onUseful={() => void useful(item)}
                />
              ) : (
                <article
                  key={`trial-${item.contentId}`}
                  className={styles.commerceTrialCard}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/products/${item.productId}?campaign=${item.contentId}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/products/${item.productId}?campaign=${item.contentId}`);
                    }
                  }}
                >
                  <img src={item.coverUrl} alt={item.title} loading="lazy" />
                  <div>
                    <span>{item.trial?.trialType === 'OFFLINE' ? '线下试用' : '线上试用'}</span>
                    <h3>{item.title}</h3>
                    <p>{item.summary || item.merchantName}</p>
                    <footer>
                      <strong>{item.merchantName}</strong>
                      <em>{item.trial ? `剩余 ${Math.max(0, item.trial.targetCount - item.trial.approvedCount)} 份` : '查看详情'}</em>
                    </footer>
                  </div>
                </article>
              ))}
            </div>
            {feed.length < total && (
              <div className={styles.loadMore}>
                <Button size="large" loading={loadingMore} onClick={() => void loadMore()}>加载更多</Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
