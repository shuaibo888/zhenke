import {
  ArrowRightOutlined,
  DownOutlined,
  EnvironmentOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Carousel, Image, Input, Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import pcCode from 'china-division/dist/pc-code.json';
import { ZhenkeEnjoyCard } from '@/components/ZhenkeEnjoyCard';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  homeContent,
  type Banner,
  type EnjoyCategory,
  type ZhenkeEnjoy,
  type ZhenkePost,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { loadCurrentLocation, saveCurrentLocation } from '@/utils/currentLocation';

type LocationStatus = 'idle' | 'locating' | 'located' | 'failed';
type RegionNode = { code: string; name: string; children?: RegionNode[] };
type CityOption = { code: string; name: string; province: string };

const PROVINCE_AS_CITY = new Set(['11', '12', '31', '50', '71', '81', '82']);
const HOT_CITY_NAMES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '重庆市', '天津市', '南京市', '武汉市', '西安市', '苏州市'];

const cityGroups = (pcCode as RegionNode[]).map((province) => {
  let cities: CityOption[];
  if (PROVINCE_AS_CITY.has(province.code)) {
    cities = [{ code: province.code, name: province.name, province: province.name }];
  } else {
    cities = (province.children ?? []).flatMap((city) => {
      if (/直辖县级行政区划/.test(city.name)) {
        return (city.children ?? []).map((area) => ({ code: area.code, name: area.name, province: province.name }));
      }
      return [{ code: city.code, name: city.name, province: province.name }];
    });
  }
  return { province: province.name, cities };
}).filter((group) => group.cities.length > 0);

const allCities = cityGroups.flatMap((group) => group.cities);
const hotCities = HOT_CITY_NAMES.map((name) => allCities.find((city) => city.name === name)).filter((city): city is CityOption => Boolean(city));

const zhenEnjoyEntries: Array<{
  code: EnjoyCategory;
  title: string;
  caption: string;
}> = [
  {
    code: 'MALL',
    title: '甄必购',
    caption: '发现值得带回家的好物',
  },
  {
    code: 'RESTAURANT',
    title: '甄必吃',
    caption: '找一顿值得专程去吃的',
  },
  {
    code: 'SCENIC',
    title: '甄必玩',
    caption: '挑一个说走就走的去处',
  },
  {
    code: 'HOTEL',
    title: '甄必住',
    caption: '住得舒服，旅途才更从容',
  },
];

const emptyEnjoyFeeds: Record<EnjoyCategory, ZhenkeEnjoy[]> = {
  MALL: [],
  RESTAURANT: [],
  SCENIC: [],
  HOTEL: [],
};

type EnjoyLoadErrors = Partial<Record<EnjoyCategory, string>>;

const locationCityLabel = (location: ReturnType<typeof loadCurrentLocation>) => {
  if (!location) return '选择城市';
  if (location.city) return location.city;
  return location.label.split('·')[0]?.trim() || '选择城市';
};

export default function HomePage() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<ZhenkePost[]>([]);
  const [bannerRows, setBannerRows] = useState<Banner[]>([]);
  const [enjoyFeeds, setEnjoyFeeds] = useState<Record<EnjoyCategory, ZhenkeEnjoy[]>>(emptyEnjoyFeeds);
  const [enjoyErrors, setEnjoyErrors] = useState<EnjoyLoadErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [initialLocation] = useState(loadCurrentLocation);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => initialLocation ? 'located' : 'idle');
  const [locationError, setLocationError] = useState('');
  const [currentArea, setCurrentArea] = useState(() => locationCityLabel(initialLocation));
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const homeRequestVersion = useRef(0);
  const locationRequestVersion = useRef(0);

  const citySearchResults = useMemo(() => {
    const keyword = citySearch.trim();
    if (!keyword) return [];
    return allCities.filter((city) => {
      const shortName = city.name.replace(/(市|地区|自治州|盟)$/, '');
      return city.name.includes(keyword) || shortName.includes(keyword) || city.province.includes(keyword);
    }).slice(0, 80);
  }, [citySearch]);

  const loadHome = useCallback(async () => {
    const requestVersion = ++homeRequestVersion.current;
    setLoading(true);
    setLoadError('');
    setBannerError('');
    setEnjoyErrors({});
    try {
      const result = await homeContent();
      if (requestVersion !== homeRequestVersion.current) return;
      setFeed(result.posts ?? []);
      setBannerRows(result.banners ?? []);
      setLoadError(result.postError ?? '');
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
      setBannerRows([]);
      setEnjoyFeeds({ ...emptyEnjoyFeeds });
      const error = reason instanceof Error ? reason.message : '首页内容加载失败';
      setLoadError(error);
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

  const locate = useCallback(() => {
    const requestVersion = ++locationRequestVersion.current;
    if (!navigator.geolocation) {
      setLocationStatus('failed');
      setLocationError('当前浏览器不支持设备定位，请手动选择城市');
      return;
    }
    setLocationError('');
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (requestVersion !== locationRequestVersion.current) return;
        try {
          const response = await fetch(
            `/api/shop/zhenke/map/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}`,
          );
          const payload = await response.json();
          if (requestVersion !== locationRequestVersion.current) return;
          if (!response.ok || payload.code !== 200) throw new Error(payload.msg || '定位解析失败');
          const city = payload.data?.city;
          const district = payload.data?.district;
          const label = city || '已定位';
          setCurrentArea(label);
          saveCurrentLocation({
            label,
            city,
            district,
            latitude: coords.latitude,
            longitude: coords.longitude,
            source: 'DEVICE',
          });
          setLocationStatus('located');
          setLocationError('');
          setCityPickerOpen(false);
          setCitySearch('');
          void loadHome();
        } catch {
          if (requestVersion !== locationRequestVersion.current) return;
          setLocationStatus('failed');
          setLocationError('地图服务暂时不可用，请手动选择城市');
        }
      },
      () => {
        if (requestVersion !== locationRequestVersion.current) return;
        setLocationStatus('failed');
        setLocationError('未获得定位权限，请手动选择城市');
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false },
    );
  }, []);

  useEffect(() => {
    if (!initialLocation) locate();
  }, [initialLocation, locate]);

  useEffect(() => () => {
    locationRequestVersion.current += 1;
  }, [loadHome]);

  const openBanner = (banner: Banner) => {
    if (banner.jumpType === 'INTERNAL') navigate(banner.jumpTarget);
    else window.location.assign(banner.jumpTarget);
  };

  const selectCity = (city: CityOption) => {
    locationRequestVersion.current += 1;
    setCurrentArea(city.name);
    saveCurrentLocation({ label: city.name, city: city.name, source: 'MANUAL' });
    setLocationStatus('located');
    setLocationError('');
    setCityPickerOpen(false);
    setCitySearch('');
    message.success('当前城市已更新');
    void loadHome();
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.visuallyHidden}>甄客行城市生活发现与分享</h1>
      <div className={styles.homeLocationRow}>
        <button
          type="button"
          className={`${styles.cityChip} ${locationStatus === 'failed' ? styles.cityChipWarning : ''}`}
          aria-label={`${currentArea}，点击切换城市`}
          onClick={() => {
            setCitySearch('');
            setCityPickerOpen(true);
          }}
        >
          <span className={styles.cityChipIcon}><EnvironmentOutlined /></span>
          <span className={styles.cityChipCopy}>
            <small>{locationStatus === 'locating' ? '定位中' : '当前城市'}</small>
            <strong>{locationStatus === 'locating' ? '正在定位…' : currentArea}</strong>
          </span>
          <DownOutlined className={styles.cityChipArrow} />
        </button>
        {locationError && (
          <button
            type="button"
            className={styles.locationFallbackHint}
            onClick={() => {
              setCitySearch('');
              setCityPickerOpen(true);
            }}
          >
            {locationError}
          </button>
        )}
      </div>

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

      <ZkSectionTitle
        title="城市里的甄客帖"
        description="看看大家最近发现了哪些值得去的地方。"
        action={<button type="button" className={styles.textButton} onClick={() => navigate('/posts')}>查看全部 →</button>}
      />

      {loading ? (
        <ZkState kind="loading" title="正在打开城市生活" />
      ) : loadError ? (
        <ZkState kind="error" title="首页暂时没有连接成功" description={loadError} onAction={() => void loadHome()} />
      ) : feed.length > 0 ? (
        <div className={styles.homePostTrack} aria-label="城市里的甄客帖，横向滑动查看更多">
          {feed.map((post) => <ZhenkePostCard key={post.postId} post={post} />)}
        </div>
      ) : (
        <ZkState
          title="还没有公开甄客帖"
          description="成为第一个认真记录这座城市的人。"
          actionText="发布第一篇"
          onAction={() => navigate('/posts/publish')}
        />
      )}

      <section className={styles.zhenEnjoySection} aria-labelledby="zhen-enjoy-title">
        <header className={styles.zhenEnjoyHeader}>
          <div>
            <h2 id="zhen-enjoy-title">甄必享</h2>
            <p>按购、吃、玩、住，发现值得专程去体验的城市生活。</p>
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
      <Modal
        open={cityPickerOpen}
        title="选择当前城市"
        footer={null}
        width={720}
        rootClassName={styles.cityPickerModal}
        onCancel={() => {
          setCityPickerOpen(false);
          setCitySearch('');
        }}
        destroyOnHidden
      >
        <Input
          size="large"
          allowClear
          prefix={<SearchOutlined />}
          value={citySearch}
          placeholder="搜索城市名称"
          aria-label="搜索城市名称"
          onChange={(event) => setCitySearch(event.target.value)}
        />
        <div className={styles.cityPickerScroll}>
          {citySearch.trim() ? (
            <section className={styles.cityPickerSection}>
              <h3>搜索结果</h3>
              {citySearchResults.length > 0 ? (
                <div className={styles.citySearchResults}>
                  {citySearchResults.map((city) => (
                    <button type="button" key={city.code} onClick={() => selectCity(city)}>
                      <strong>{city.name}</strong>
                      {city.province !== city.name ? <small>{city.province}</small> : null}
                    </button>
                  ))}
                </div>
              ) : <p className={styles.cityPickerEmpty}>没有找到这个城市，请换个名称搜索。</p>}
            </section>
          ) : (
            <>
              <section className={styles.cityPickerSection}>
                <h3>定位 / 当前城市</h3>
                <button
                  type="button"
                  className={styles.cityCurrentButton}
                  onClick={locate}
                  disabled={locationStatus === 'locating'}
                >
                  <span><EnvironmentOutlined /></span>
                  <strong>{locationStatus === 'locating' ? '正在定位…' : currentArea}</strong>
                  <small>{locationStatus === 'locating' ? '请稍候' : '重新定位'}</small>
                </button>
              </section>
              <section className={styles.cityPickerSection}>
                <h3>热门城市</h3>
                <div className={styles.hotCityGrid}>
                  {hotCities.map((city) => (
                    <button type="button" key={city.code} onClick={() => selectCity(city)}>{city.name.replace(/市$/, '')}</button>
                  ))}
                </div>
              </section>
              <section className={styles.cityPickerSection}>
                <h3>按省份选择</h3>
                <div className={styles.cityProvinceList}>
                  {cityGroups.map((group) => (
                    <section key={group.province}>
                      <h4>{group.province}</h4>
                      <div>
                        {group.cities.map((city) => (
                          <button type="button" key={city.code} onClick={() => selectCity(city)}>{city.name}</button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </Modal>
    </main>
  );
}
