import {
  AppstoreOutlined,
  CompassOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ReadOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Carousel, Input, Modal, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'umi';
import { ZhenkePostCard } from '@/components/ZhenkePostCard';
import { ZkSectionTitle, ZkState } from '@/components/ZkPage';
import {
  banners,
  posts,
  type Banner,
  type ZhenkePost,
} from '@/services/zhenke';
import styles from '@/styles/zhenke.less';
import { loadCurrentLocation, saveCurrentLocation } from '@/utils/currentLocation';

type LocationStatus = 'idle' | 'locating' | 'located' | 'failed';

export default function HomePage() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<ZhenkePost[]>([]);
  const [bannerRows, setBannerRows] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [initialLocation] = useState(loadCurrentLocation);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => initialLocation ? 'located' : 'idle');
  const [currentArea, setCurrentArea] = useState(() => initialLocation?.label ?? '选择当前市区');
  const [manualAreaOpen, setManualAreaOpen] = useState(false);
  const [manualArea, setManualArea] = useState('');

  const loadHome = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setBannerError('');
    const [postResult, bannerResult] = await Promise.allSettled([
      posts('RECOMMEND', 1, 9),
      banners(),
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
      setBannerError('精选轮播暂时不可用，不影响甄客帖和商城浏览。');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('failed');
      message.warning('当前浏览器不支持设备定位，可在发布页通过关键词选择地点');
      return;
    }
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
          const label = city && district && city !== district ? `${city} · ${district}` : district || city || '已定位';
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
        } catch (error) {
          setLocationStatus('failed');
          message.warning(error instanceof Error ? error.message : '地图服务暂时不可用');
        }
      },
      () => {
        setLocationStatus('failed');
        message.info('未获得定位权限，仍可浏览全平台内容，并在发布时手动选点');
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

  const confirmManualArea = () => {
    const area = manualArea.trim();
    if (area.length < 2 || area.length > 30) {
      message.warning('请输入 2 至 30 个字的市区名称');
      return;
    }
    setCurrentArea(area);
    saveCurrentLocation({ label: area, city: area, source: 'MANUAL' });
    setLocationStatus('located');
    setManualAreaOpen(false);
    message.success('当前市区已手动更新；首页内容不会因此被过滤');
  };

  return (
    <main className={styles.page}>
      <section className={styles.heroGrid}>
        <article className={`${styles.locationHero} ${styles.surface}`}>
          <span className={styles.locationLabel}>
            <EnvironmentOutlined /> 当前市区
          </span>
          <h1>{currentArea}<br />今天去哪里看看？</h1>
          <p>
            甄客行用真实定位帮助你显示当前市区、选择地点和打开导航。
            首页与专区内容始终来自全平台，不会因为你所在的城市而被过滤。
          </p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryButton} onClick={locate} disabled={locationStatus === 'locating'}>
              <CompassOutlined /> {locationStatus === 'locating' ? '正在定位…' : locationStatus === 'located' ? '更新定位' : '开启设备定位'}
            </button>
            <button type="button" className={styles.heroSecondary} onClick={() => navigate('/posts/publish')}>
              <EditOutlined /> 选择地点并发布
            </button>
            <button type="button" className={styles.heroTertiary} onClick={() => {
              setManualArea(currentArea === '选择当前市区' ? '' : currentArea);
              setManualAreaOpen(true);
            }}>
              手动选择市区
            </button>
          </div>
        </article>

        <aside className={`${styles.quickPanel} ${styles.surface}`}>
          <div>
            <span className={styles.eyebrow}>LOCAL LIFE</span>
            <h2>从一篇真实分享，认识一座城。</h2>
            <p>看地点、读体验，也可以进入商城购买商家提供的真实套餐。</p>
          </div>
          <div className={styles.quickLinks}>
            <button type="button" className={styles.quickLink} onClick={() => navigate('/posts')}>
              <span><ReadOutlined /></span>
              <strong>逛甄客帖</strong>
              <small>发现城市生活</small>
            </button>
            <button type="button" className={styles.quickLink} onClick={() => navigate('/mall')}>
              <span><AppstoreOutlined /></span>
              <strong>去商城</strong>
              <small>套餐到店核销</small>
            </button>
          </div>
        </aside>
      </section>

      {bannerRows.length > 0 && (
        <Carousel autoplay dots className={styles.bannerCarousel}>
          {bannerRows.map((banner) => (
            <div key={banner.bannerId}>
              <article
                className={styles.bannerSlide}
                role="link"
                tabIndex={0}
                onClick={() => openBanner(banner)}
                onKeyDown={(event) => event.key === 'Enter' && openBanner(banner)}
              >
                <img src={banner.imageUrl} alt="" />
                <div className={styles.bannerCopy}>
                  <span className={styles.eyebrow}>甄客行精选</span>
                  <h2>{banner.title}</h2>
                  {banner.subtitle && <p>{banner.subtitle}</p>}
                </div>
              </article>
            </div>
          ))}
        </Carousel>
      )}
      {bannerError && <div className={styles.contextNotice}>{bannerError}</div>}

      <ZkSectionTitle
        title="城市里的甄客帖"
        description="推荐区按公开时间倒序展示全平台内容，地点是发布者主动选择的信息。"
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
          description="成为第一个认真记录这座城市的人。图片或视频至少上传一个，地点需要从地图服务中选择。"
          actionText="发布第一篇"
          onAction={() => navigate('/posts/publish')}
        />
      )}

      <ZkSectionTitle
        title="本地生活交易"
        description="商城只是甄客行里的交易模块，酒店、饭店、景区套餐统一下单并线下核销。"
        action={<button type="button" className={styles.textButton} onClick={() => navigate('/mall')}>进入商城 →</button>}
      />
      <div className={styles.sceneGrid}>
        <button type="button" className={styles.sceneCard} onClick={() => navigate('/mall?scene=ZHENKE_HOTEL')}>
          <span>住</span><strong>甄客酒店</strong><p>住宿套餐 · 到店核销</p>
        </button>
        <button type="button" className={styles.sceneCard} onClick={() => navigate('/mall?scene=ZHENKE_RESTAURANT')}>
          <span>食</span><strong>甄客饭店</strong><p>餐饮套餐 · 到店核销</p>
        </button>
        <button type="button" className={styles.sceneCard} onClick={() => navigate('/mall?scene=ZHENKE_SCENIC')}>
          <span>游</span><strong>甄客景区</strong><p>门票线路 · 现场核销</p>
        </button>
      </div>
      <div className={styles.contextNotice}>
        <ShopOutlined /> 商城商品来自已入驻商家；普通地点不等同于商家，也不会因为名称相同自动绑定。
      </div>

      <Modal
        open={manualAreaOpen}
        title="手动选择当前市区"
        okText="确认显示"
        cancelText="取消"
        onOk={confirmManualArea}
        onCancel={() => setManualAreaOpen(false)}
        destroyOnHidden
      >
        <p className={styles.manualAreaHint}>
          此处只更新首页左上角的当前位置显示，不会按城市筛选首页、甄客帖或专区内容。
        </p>
        <Input
          autoFocus
          value={manualArea}
          maxLength={30}
          placeholder="例如：上海市黄浦区"
          onChange={(event) => setManualArea(event.target.value)}
          onPressEnter={confirmManualArea}
        />
      </Modal>
    </main>
  );
}
