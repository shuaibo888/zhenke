import {
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Carousel, Image } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { ZhenkeEnjoyCard } from '@/components/ZhenkeEnjoyCard';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { usePostPublishLauncher } from '@/components/PostPublishLauncher';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  homeContent,
  type Banner,
  type EnjoyCategory,
  type ZhenkeEnjoy,
  type ZhenkePost,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { CURRENT_LOCATION_CHANGED_EVENT } from '@/utils/currentLocation';

const zhenEnjoyEntries: Array<{
  code: EnjoyCategory;
  title: string;
  caption: string;
}> = [
  {
    code: 'SCENIC',
    title: '甄必玩',
    caption: '大家都在玩什么',
  },
  {
    code: 'RESTAURANT',
    title: '甄必吃',
    caption: '大家都在吃什么',
  },
  {
    code: 'HOTEL',
    title: '甄必住',
    caption: '大家都在住什么',
  },
  {
    code: 'MALL',
    title: '甄必购',
    caption: '大家都在买什么',
  },
];

const emptyEnjoyFeeds: Record<EnjoyCategory, ZhenkeEnjoy[]> = {
  MALL: [],
  RESTAURANT: [],
  SCENIC: [],
  HOTEL: [],
};

type EnjoyLoadErrors = Partial<Record<EnjoyCategory, string>>;

export default function HomePage() {
  const navigate = useNavigate();
  const { startPostPublish } = usePostPublishLauncher();
  const [feed, setFeed] = useState<ZhenkePost[]>([]);
  const [featuredFeed, setFeaturedFeed] = useState<ZhenkePost[]>([]);
  const [bannerRows, setBannerRows] = useState<Banner[]>([]);
  const [enjoyFeeds, setEnjoyFeeds] = useState<Record<EnjoyCategory, ZhenkeEnjoy[]>>(emptyEnjoyFeeds);
  const [enjoyErrors, setEnjoyErrors] = useState<EnjoyLoadErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [featuredError, setFeaturedError] = useState('');
  const [bannerError, setBannerError] = useState('');
  const homeRequestVersion = useRef(0);

  const loadHome = useCallback(async () => {
    const requestVersion = ++homeRequestVersion.current;
    setLoading(true);
    setLoadError('');
    setFeaturedError('');
    setBannerError('');
    setEnjoyErrors({});
    try {
      const result = await homeContent();
      if (requestVersion !== homeRequestVersion.current) return;
      const featuredPosts = (result.featuredPosts ?? []).slice(0, 3);
      const featuredPostIds = new Set(featuredPosts.map((post) => post.postId));
      setFeaturedFeed(featuredPosts);
      setFeed((result.posts ?? []).filter((post) => !featuredPostIds.has(post.postId)));
      setBannerRows(result.banners ?? []);
      setLoadError(result.postError ?? '');
      setFeaturedError(result.featuredPostError ?? '');
      setBannerError(result.bannerError ?? '');
      const next = { ...emptyEnjoyFeeds };
      zhenEnjoyEntries.forEach((entry) => {
        next[entry.code] = result.enjoys?.[entry.code] ?? [];
      });
      setEnjoyFeeds(next);
      setEnjoyErrors(result.enjoyError
        ? Object.fromEntries(
          zhenEnjoyEntries.map((entry) => [entry.code, result.enjoyError]),
        ) as EnjoyLoadErrors
        : {});
    } catch (reason) {
      if (requestVersion !== homeRequestVersion.current) return;
      setFeed([]);
      setFeaturedFeed([]);
      setBannerRows([]);
      setEnjoyFeeds({ ...emptyEnjoyFeeds });
      const error = reason instanceof Error ? reason.message : '首页内容加载失败';
      setLoadError(error);
      setFeaturedError(error);
      setBannerError('今日精选暂时没有加载成功，请稍后再试。');
      setEnjoyErrors(Object.fromEntries(
        zhenEnjoyEntries.map((entry) => [entry.code, error]),
      ) as EnjoyLoadErrors);
    } finally {
      if (requestVersion === homeRequestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
    return () => { homeRequestVersion.current += 1; };
  }, [loadHome]);

  useEffect(() => {
    const refreshLocation = () => {
      void loadHome();
    };
    window.addEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshLocation);
    return () => window.removeEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshLocation);
  }, [loadHome]);

  const openBanner = (banner: Banner) => {
    if (banner.jumpType === 'INTERNAL') navigate(banner.jumpTarget);
    else window.location.assign(banner.jumpTarget);
  };

  return (
    <main className={styles.page}>
        <h1 className={styles.visuallyHidden}>甄客行城市生活发现与分享</h1>

      <section className={styles.homeLead} aria-label="甄客行今日精选">
        {bannerRows.length > 0 ? (
          <>
            <Carousel
              autoplay={bannerRows.length > 1}
              autoplaySpeed={5000}
              pauseOnHover={false}
              dots
              className={styles.bannerCarousel}
            >
              {bannerRows.map((banner, index) => (
                <div key={banner.bannerId}>
                  <article className={styles.bannerSlide}>
                    <div className={styles.bannerMedia}>
                      <Image
                        src={banner.imageUrl}
                        alt={`${banner.title}轮播图`}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        classNames={{
                          root: styles.bannerPreview,
                          image: styles.bannerImage,
                        }}
                        preview={false}
                      />
                    </div>
                    <div className={styles.bannerCopy}>
                      <div className={styles.bannerText}>
                        <span className={styles.eyebrow}>甄客行精选</span>
                        <h2>{banner.title}</h2>
                        {banner.subtitle && <p>{banner.subtitle}</p>}
                      </div>
                      <button type="button" className={styles.bannerAction} onClick={() => openBanner(banner)}>
                        进入专题 <ArrowRightOutlined />
                      </button>
                    </div>
                  </article>
                </div>
              ))}
            </Carousel>
          </>
        ) : (
          <div className={`${styles.bannerFallback} ${loading ? styles.bannerFallbackLoading : ''}`}>
            <div>
              <span className={styles.eyebrow}>{loading ? '正在准备今日精选' : '甄客行'}</span>
              <h2>{loading ? '正在打开城市生活…' : '发现城市里值得分享的地方'}</h2>
              {!loading && bannerError && <p>{bannerError}</p>}
            </div>
          </div>
        )}
      </section>

      {!loading && (featuredFeed.length > 0 || featuredError) && (
        <section className={styles.featuredPostSection} aria-labelledby="featured-posts-title">
          <ZkSectionTitle
            title="精选甄客帖"
            description="由甄客行运营挑选的实用城市分享。"
            action={featuredFeed.length > 0
              ? <button type="button" className={styles.textButton} onClick={() => navigate('/posts')}>浏览全部甄客帖 →</button>
              : undefined}
          />
          <span id="featured-posts-title" className={styles.visuallyHidden}>精选甄客帖</span>
          {featuredFeed.length > 0 ? (
            <div className={styles.homePostTrack} aria-label="精选甄客帖，横向滑动查看更多">
              {featuredFeed.map((post) => <ZhenkePostCard key={post.postId} post={{ ...post, featured: true }} />)}
            </div>
          ) : (
            <ZkState
              kind="error"
              title="精选甄客帖暂时没有加载成功"
              description={featuredError}
              onAction={() => void loadHome()}
            />
          )}
        </section>
      )}

      <ZkSectionTitle
        title="同城甄客帖"
        description="如果您知道同城哪儿值得推荐，欢迎分享！"
        action={<button type="button" className={styles.textButton} onClick={() => navigate('/posts')}>查看全部 →</button>}
      />

      {loading ? (
        <ZkState kind="loading" title="正在打开城市生活" />
      ) : loadError ? (
        <ZkState kind="error" title="首页暂时没有连接成功" description={loadError} onAction={() => void loadHome()} />
      ) : feed.length > 0 ? (
        <div className={styles.homePostTrack} aria-label="同城甄客帖，横向滑动查看更多">
          {feed.map((post) => <ZhenkePostCard key={post.postId} post={post} />)}
        </div>
      ) : (
        <ZkState
          title="还没有公开甄客帖"
          description="成为第一个认真记录这座城市的人。"
          actionText="发布第一篇"
          onAction={() => startPostPublish()}
        />
      )}

      <section className={styles.zhenEnjoySection} aria-labelledby="zhen-enjoy-title">
        <header className={styles.zhenEnjoyHeader}>
          <div>
            <span>甄客行官方精选</span>
            <h2 id="zhen-enjoy-title">甄必享</h2>
            <p>按玩、吃、住、购，发现值得专程去体验的城市生活。</p>
          </div>
        </header>
        <div className={styles.zhenEnjoyGroups}>
          {zhenEnjoyEntries.map((entry) => {
            const rows = enjoyFeeds[entry.code];
            const error = enjoyErrors[entry.code];
            const titleId = `zhen-enjoy-${entry.code.toLowerCase()}`;
            return (
              <section key={entry.code} className={styles.zhenEnjoyGroup} aria-labelledby={titleId}>
                <header className={styles.zhenEnjoyGroupHeader}>
                  <div>
                    <h3 id={titleId}>{entry.title}</h3>
                    <p>{entry.caption}</p>
                  </div>
                  <button type="button" className={styles.textButton} onClick={() => navigate(`/enjoy?category=${entry.code}`)}>
                    查看全部 →
                  </button>
                </header>
                {loading ? (
                  <div className={styles.zhenEnjoyEmpty} aria-live="polite">
                    <div>
                      <strong>正在加载{entry.title}</strong>
                      <p>内容马上就好。</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className={`${styles.zhenEnjoyEmpty} ${styles.zhenEnjoyEmptyError}`}>
                    <div>
                      <strong>{entry.title}暂时没有连接成功</strong>
                      <p>{error}</p>
                    </div>
                    <button type="button" onClick={() => void loadHome()}>重新加载</button>
                  </div>
                ) : rows.length > 0 ? (
                  <div className={styles.zhenEnjoyGroupList}>
                    {rows.map((item) => <ZhenkeEnjoyCard key={item.enjoyId} item={item} />)}
                  </div>
                ) : (
                  <div className={styles.zhenEnjoyEmpty}>
                    <div>
                      <strong>{entry.title}内容更新中</strong>
                      <p>稍后再来看看。</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
