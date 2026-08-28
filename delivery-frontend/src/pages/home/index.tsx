import {
  ArrowRightOutlined,
  CoffeeOutlined,
  CompassOutlined,
  DownOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  SearchOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { Carousel, Image, Input, Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'umi';
import pcaCode from 'china-division/dist/pca-code.json';
import { ZhenkeEnjoyCard } from '@/components/ZhenkeEnjoyCard';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  banners,
  enjoys,
  posts,
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

const cityGroups = (pcaCode as RegionNode[]).map((province) => {
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
  icon: React.ReactNode;
}> = [
  {
    code: 'MALL',
    title: '甄必购',
    caption: '发现值得带回家的好物',
    icon: <ShoppingOutlined />,
  },
  {
    code: 'RESTAURANT',
    title: '甄必吃',
    caption: '找一顿值得专程去吃的',
    icon: <CoffeeOutlined />,
  },
  {
    code: 'SCENIC',
    title: '甄必玩',
    caption: '挑一个说走就走的去处',
    icon: <CompassOutlined />,
  },
  {
    code: 'HOTEL',
    title: '甄必住',
    caption: '住得舒服，旅途才更从容',
    icon: <HomeOutlined />,
  },
];

const emptyEnjoyFeeds: Record<EnjoyCategory, ZhenkeEnjoy[]> = {
  MALL: [],
  RESTAURANT: [],
  SCENIC: [],
  HOTEL: [],
};

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
  const [activeEnjoy, setActiveEnjoy] = useState<EnjoyCategory>('MALL');
  const [enjoyError, setEnjoyError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [initialLocation] = useState(loadCurrentLocation);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => initialLocation ? 'located' : 'idle');
  const [locationError, setLocationError] = useState('');
  const [currentArea, setCurrentArea] = useState(() => locationCityLabel(initialLocation));
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const citySearchResults = useMemo(() => {
    const keyword = citySearch.trim();
    if (!keyword) return [];
    return allCities.filter((city) => {
      const shortName = city.name.replace(/(市|地区|自治州|盟)$/, '');
      return city.name.includes(keyword) || shortName.includes(keyword) || city.province.includes(keyword);
    }).slice(0, 80);
  }, [citySearch]);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setBannerError('');
    setEnjoyError('');
    const [postResult, bannerResult, enjoyResult] = await Promise.allSettled([
      posts('RECOMMEND', 1, 9),
      banners(),
      Promise.all(zhenEnjoyEntries.map(async (entry) => [
        entry.code,
        (await enjoys(entry.code, 1, 6)).rows,
      ] as const)),
    ]);
    if (postResult.status === 'fulfilled') {
      setFeed(postResult.value.rows);
    } else {
      setFeed([]);
      setLoadError(postResult.reason instanceof Error ? postResult.reason.message : '首页内容加载失败');
    }
    if (bannerResult.status === 'fulfilled') {
      setBannerRows(bannerResult.value);
    } else {
      setBannerRows([]);
      setBannerError('今日精选暂时没有加载成功，请稍后再试。');
    }
    if (enjoyResult.status === 'fulfilled') {
      const next = { ...emptyEnjoyFeeds };
      enjoyResult.value.forEach(([category, rows]) => { next[category] = rows; });
      setEnjoyFeeds(next);
      const firstPopulated = zhenEnjoyEntries.find((entry) => next[entry.code].length > 0);
      if (firstPopulated) setActiveEnjoy(firstPopulated.code);
    } else {
      setEnjoyFeeds({ ...emptyEnjoyFeeds });
      setEnjoyError('甄必享内容暂时没有加载成功');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('failed');
      setLocationError('当前浏览器不支持设备定位，请手动选择城市');
      return;
    }
    setLocationError('');
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `/api/shop/zhenke/map/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}`,
          );
          const payload = await response.json();
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
        } catch {
          setLocationStatus('failed');
          setLocationError('地图服务暂时不可用，请手动选择城市');
        }
      },
      () => {
        setLocationStatus('failed');
        setLocationError('未获得定位权限，请手动选择城市');
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false },
    );
  }, []);

  useEffect(() => {
    if (!initialLocation) locate();
  }, [initialLocation, locate]);

  const openBanner = (banner: Banner) => {
    if (banner.jumpType === 'INTERNAL') navigate(banner.jumpTarget);
    else window.location.assign(banner.jumpTarget);
  };

  const selectCity = (city: CityOption) => {
    setCurrentArea(city.name);
    saveCurrentLocation({ label: city.name, city: city.name, source: 'MANUAL' });
    setLocationStatus('located');
    setLocationError('');
    setCityPickerOpen(false);
    setCitySearch('');
    message.success('当前城市已更新');
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
          <Carousel autoplay dots className={styles.bannerCarousel}>
            {bannerRows.map((banner) => (
              <div key={banner.bannerId}>
                <article className={styles.bannerSlide}>
                  <div className={styles.bannerMedia}>
                    <Image
                      src={banner.imageUrl}
                      alt={`${banner.title}轮播图`}
                      classNames={{
                        root: styles.bannerPreview,
                        image: styles.bannerImage,
                        cover: styles.bannerPreviewCover,
                      }}
                      preview={{ mask: '查看大图' }}
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
        <div className={styles.postGrid}>
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
            <span>甄选城市生活</span>
            <h2 id="zhen-enjoy-title">甄必享</h2>
          </div>
          <button type="button" className={styles.textButton} onClick={() => navigate(`/enjoy?category=${activeEnjoy}`)}>查看全部 →</button>
        </header>
        <div className={styles.zhenEnjoyRail}>
          {zhenEnjoyEntries.map((entry, index) => (
            <button
              key={entry.code}
              type="button"
              className={`${styles.zhenEnjoyCard} ${activeEnjoy === entry.code ? styles.zhenEnjoyCardActive : ''}`}
              aria-pressed={activeEnjoy === entry.code}
              onClick={() => setActiveEnjoy(entry.code)}
            >
              <span className={styles.zhenEnjoyIndex}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.zhenEnjoyIcon}>{entry.icon}</span>
              <strong>{entry.title}</strong>
              <p>{entry.caption}</p>
              <em>{enjoyFeeds[entry.code].length > 0 ? `${enjoyFeeds[entry.code].length} 条精选` : '内容筹备中'}</em>
            </button>
          ))}
        </div>
        <div className={styles.zhenEnjoyContent}>
          {enjoyError ? (
            <ZkState kind="error" title="甄必享暂时没有连接成功" description={enjoyError} onAction={() => void loadHome()} />
          ) : enjoyFeeds[activeEnjoy].length > 0 ? (
            <div className={styles.enjoyEditorialGrid}>
              {enjoyFeeds[activeEnjoy].map((item) => <ZhenkeEnjoyCard key={item.enjoyId} item={item} />)}
            </div>
          ) : (
            <div className={styles.zhenEnjoyEmpty}>
              <span>{zhenEnjoyEntries.find((entry) => entry.code === activeEnjoy)?.icon}</span>
              <div>
                <strong>{zhenEnjoyEntries.find((entry) => entry.code === activeEnjoy)?.title}正在准备</strong>
                <p>平台运营团队正在整理本期精选内容。</p>
              </div>
            </div>
          )}
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
        <p className={styles.manualAreaHint}>
          定位和城市选择只更新当前城市显示，不会限制你浏览其他城市的内容。
        </p>
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
