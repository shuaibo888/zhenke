import homeStyles from './index.module.less';
import { Carousel, Image } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import { ZhenkeEnjoyCard } from '@/components/ZhenkeEnjoyCard';
// import { ServiceDiscoveryMap } from '@/components/ServiceDiscoveryMap';
import {
  homeContent,
  type Banner,
  type EnjoyCategory,
  type ZhenkeEnjoy,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { CURRENT_LOCATION_CHANGED_EVENT } from '@/utils/currentLocation';

const zhenEnjoyEntries: Array<{
  code: EnjoyCategory;
  title: string;
}> = [
  {
    code: 'SCENIC',
    title: '甄必玩',
  },
  {
    code: 'RESTAURANT',
    title: '甄必吃',
  },
  {
    code: 'HOTEL',
    title: '甄必住',
  },
  {
    code: 'MALL',
    title: '甄必购',
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
  const [bannerRows, setBannerRows] = useState<Banner[]>([]);
  const [enjoyFeeds, setEnjoyFeeds] = useState<Record<EnjoyCategory, ZhenkeEnjoy[]>>(emptyEnjoyFeeds);
  const [enjoyErrors, setEnjoyErrors] = useState<EnjoyLoadErrors>({});
  const [loading, setLoading] = useState(true);
  const [bannerError, setBannerError] = useState('');
  const homeRequestVersion = useRef(0);

  const loadHome = useCallback(async () => {
    const requestVersion = ++homeRequestVersion.current;
    setLoading(true);
    setBannerError('');
    setEnjoyErrors({});
    try {
      const result = await homeContent();
      if (requestVersion !== homeRequestVersion.current) return;
      setBannerRows(result.banners ?? []);
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
      setBannerRows([]);
      setEnjoyFeeds({ ...emptyEnjoyFeeds });
      const error = reason instanceof Error ? reason.message : '首页内容加载失败';
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
                  <article
                    className={`${styles.bannerSlide} ${banner.title?.trim() || banner.subtitle?.trim() ? styles.bannerSlideWithCopy : ''}`}
                    role="link"
                    tabIndex={0}
                    aria-label={banner.title?.trim() || banner.subtitle?.trim() || '查看轮播内容'}
                    onClick={() => openBanner(banner)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openBanner(banner);
                      }
                    }}
                  >
                    <div className={styles.bannerMedia}>
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title?.trim() ? `${banner.title}轮播图` : '首页轮播图'}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        classNames={{
                          root: styles.bannerPreview,
                          image: styles.bannerImage,
                        }}
                        preview={false}
                      />
                    </div>
                    {(banner.title?.trim() || banner.subtitle?.trim()) && (
                      <div className={styles.bannerCopy}>
                        {banner.title?.trim() && <h2>{banner.title}</h2>}
                        {banner.subtitle?.trim() && <p>{banner.subtitle}</p>}
                      </div>
                    )}
                  </article>
                </div>
              ))}
            </Carousel>
          </>
        ) : (
          <div className={`${styles.bannerFallback} ${loading ? styles.bannerFallbackLoading : ''}`}>
            <div>
              <h2>{loading ? '正在加载' : '发现城市里值得分享的地方'}</h2>
              {!loading && bannerError && <p>{bannerError}</p>}
            </div>
          </div>
        )}
      </section>

      {/* 服务地图暂缓上线：恢复时取消本行 JSX 和顶部 ServiceDiscoveryMap import 的注释。 */}
      {/* <ServiceDiscoveryMap /> */}

      <section className={`${styles.zhenEnjoySection} ${homeStyles.enjoySection}`} aria-labelledby="zhen-enjoy-title">
        <header className={styles.zhenEnjoyHeader}>
          <div>
            <h2 id="zhen-enjoy-title">甄必享</h2>
          </div>
        </header>
        <div className={styles.zhenEnjoyGroups}>
          {zhenEnjoyEntries.map((entry) => {
            const rows = enjoyFeeds[entry.code];
            const error = enjoyErrors[entry.code];
            const titleId = `zhen-enjoy-${entry.code.toLowerCase()}`;
            return (
              <section key={entry.code} className={`${styles.zhenEnjoyGroup} ${homeStyles.categoryGroup}`} aria-labelledby={titleId}>
                <header className={styles.zhenEnjoyGroupHeader}>
                  <div>
                    <h3 id={titleId}>{entry.title}</h3>
                  </div>
                  <button type="button" className={styles.textButton} onClick={() => navigate(`/enjoy?category=${entry.code}`)}>
                    查看全部 →
                  </button>
                </header>
                {loading ? (
                  <div className={styles.zhenEnjoyEmpty} aria-live="polite">
                    <div>
                      <strong>正在加载</strong>
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
                      <strong>暂无内容</strong>
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
