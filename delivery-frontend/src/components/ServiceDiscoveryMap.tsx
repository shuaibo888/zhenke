import {
  AimOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Spin } from 'antd';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'umi';
import {
  browserMapConfig,
  mapReverse,
  mapRegionCenter,
  serviceMapPoints,
  type MapCenter,
  type ServiceMapPoint,
} from '@/services/zhenke';
import {
  CURRENT_LOCATION_CHANGED_EVENT,
  currentLocationCityLabel,
  ensureCurrentLocation,
  loadCurrentLocation,
  notifyCurrentLocationChanged,
  saveCurrentLocation,
  type CurrentLocation,
} from '@/utils/currentLocation';
import styles from '@/styles/zhenke.less';

type FilterKey = 'POST' | 'SCENIC' | 'RESTAURANT' | 'HOTEL' | 'MALL' | 'MERCHANT';
type TencentLatLng = { getLat: () => number; getLng: () => number };
type TencentMapEvent = { geometry?: { properties?: { pointKey?: string } } };
type TencentMapInstance = {
  destroy: () => void;
  getCenter: () => TencentLatLng;
  getZoom: () => number;
  on: (event: string, listener: (event: TencentMapEvent) => void) => void;
  off: (event: string, listener: (event: TencentMapEvent) => void) => void;
  setCenter: (center: TencentLatLng) => void;
  setZoom: (zoom: number) => void;
};
type TencentMarkerLayer = {
  on: (event: string, listener: (event: TencentMapEvent) => void) => void;
  off: (event: string, listener: (event: TencentMapEvent) => void) => void;
  setGeometries: (geometries: unknown[]) => void;
  setMap: (map: TencentMapInstance | null) => void;
};
type TencentMapApi = {
  LatLng: new (latitude: number, longitude: number) => TencentLatLng;
  Map: new (container: HTMLElement, options: Record<string, unknown>) => TencentMapInstance;
  MarkerStyle: new (options: Record<string, unknown>) => unknown;
  MultiMarker: new (options: Record<string, unknown>) => TencentMarkerLayer;
};

declare global {
  interface Window {
    TMap?: TencentMapApi;
  }
}

const filterEntries: Array<{
  key: FilterKey;
  label: string;
  shortLabel: string;
  color: string;
}> = [
  { key: 'POST', label: '甄客帖', shortLabel: '帖', color: '#e65f3c' },
  { key: 'SCENIC', label: '甄必玩', shortLabel: '玩', color: '#258a69' },
  { key: 'RESTAURANT', label: '甄必吃', shortLabel: '吃', color: '#c94f42' },
  { key: 'HOTEL', label: '甄必住', shortLabel: '住', color: '#6562a8' },
  { key: 'MALL', label: '甄必购', shortLabel: '购', color: '#b97819' },
  { key: 'MERCHANT', label: '入驻商家', shortLabel: '商', color: '#286987' },
];

const filterByKey = Object.fromEntries(filterEntries.map((entry) => [entry.key, entry])) as Record<FilterKey, typeof filterEntries[number]>;
let sdkPromise: Promise<TencentMapApi> | null = null;

function pointFilter(point: ServiceMapPoint): FilterKey {
  if (point.sourceType === 'ENJOY') return point.category ?? 'MALL';
  return point.sourceType;
}

function loadTencentMapSdk(key: string, version: string) {
  if (window.TMap) return Promise.resolve(window.TMap);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<TencentMapApi>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => reject(new Error('腾讯地图加载超时，请重试')), 15000);
    script.charset = 'utf-8';
    script.async = true;
    script.src = `https://map.qq.com/api/gljs?v=${encodeURIComponent(version || '1.exp')}&key=${encodeURIComponent(key)}`;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.TMap) resolve(window.TMap);
      else reject(new Error('腾讯地图没有返回可用的浏览器组件'));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('腾讯地图脚本加载失败，请检查网络后重试'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}

function markerSvg(color: string, label: string, current = false, selected = false) {
  const svg = current
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="14" fill="#fff" fill-opacity=".92"/><circle cx="19" cy="19" r="10" fill="#ff6b1a" fill-opacity=".2"/><circle cx="19" cy="19" r="5" fill="#ff6b1a"/><circle cx="19" cy="19" r="14" fill="none" stroke="#ff6b1a" stroke-width="2"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52"><path d="M22 1C10.4 1 1 10.2 1 21.6 1 37.2 22 51 22 51s21-13.8 21-29.4C43 10.2 33.6 1 22 1Z" fill="${color}" stroke="${selected ? '#3f3029' : '#fff'}" stroke-width="${selected ? '3' : '2'}"/><circle cx="22" cy="21" r="12.5" fill="#fff" fill-opacity=".96"/><text x="22" y="26" text-anchor="middle" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="14" font-weight="700" fill="${color}">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function MapMarkerGlyph({ entry }: { entry: typeof filterEntries[number] }) {
  return (
    <svg
      className={styles.serviceMapMarkerGlyph}
      viewBox="0 0 44 52"
      aria-hidden="true"
      focusable="false"
      style={{ '--marker-color': entry.color } as CSSProperties}
    >
      <path d="M22 1C10.4 1 1 10.2 1 21.6 1 37.2 22 51 22 51s21-13.8 21-29.4C43 10.2 33.6 1 22 1Z" />
      <circle cx="22" cy="21" r="12.5" />
      <text x="22" y="26" textAnchor="middle">{entry.shortLabel}</text>
    </svg>
  );
}

function pointPath(point: ServiceMapPoint) {
  if (point.sourceType === 'MERCHANT') return `/merchants/${point.targetId}`;
  if (point.sourceType === 'ENJOY') return `/enjoy/${point.targetId}`;
  return point.placeId ? `/places/${point.placeId}` : `/posts/${point.targetId}`;
}

function pointMeta(point: ServiceMapPoint) {
  if (point.sourceType === 'MERCHANT') {
    return `${point.contentCount || 0} 件商品 · ${point.relatedCount || 0} 篇甄客验`;
  }
  if (point.sourceType === 'POST') return `${point.contentCount || 1} 篇甄客帖`;
  return `${point.contentCount || 1} 个${filterByKey[pointFilter(point)].label}专题`;
}

export function ServiceDiscoveryMap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TencentMapInstance | null>(null);
  const markerLayerRef = useRef<TencentMarkerLayer | null>(null);
  const currentMarkerRef = useRef<TencentMarkerLayer | null>(null);
  const apiRef = useRef<TencentMapApi | null>(null);
  const pointsRef = useRef<ServiceMapPoint[]>([]);
  const locationRequestRef = useRef(0);
  const pointsRequestRef = useRef(0);
  const viewportRegionRequestRef = useRef(0);
  const viewportRegionTimerRef = useRef<number | null>(null);
  const [api, setApi] = useState<TencentMapApi | null>(null);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(() => loadCurrentLocation());
  const [currentCenter, setCurrentCenter] = useState<MapCenter | null>(null);
  const [points, setPoints] = useState<ServiceMapPoint[]>([]);
  const [enabledFilters, setEnabledFilters] = useState<Set<FilterKey>>(() => new Set(filterEntries.map((entry) => entry.key)));
  const [selected, setSelected] = useState<ServiceMapPoint | null>(null);
  const [locationError, setLocationError] = useState('');
  const [mapError, setMapError] = useState('');
  const [pointsError, setPointsError] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [pointsLoading, setPointsLoading] = useState(false);

  const resolveLocation = useCallback(async (location = loadCurrentLocation(), forceDevice = false) => {
    const requestVersion = ++locationRequestRef.current;
    setLocationError('');
    try {
      const resolved = forceDevice || !location ? await ensureCurrentLocation({ force: forceDevice }) : location;
      let center = resolved.latitude !== undefined && resolved.longitude !== undefined
        ? { latitude: resolved.latitude, longitude: resolved.longitude }
        : null;
      if (!center) {
        const region = resolved.city?.trim() || resolved.label.trim();
        center = await mapRegionCenter(region);
        const withCoordinates = saveCurrentLocation({
          label: resolved.label,
          city: resolved.city,
          district: resolved.district,
          latitude: center.latitude,
          longitude: center.longitude,
          source: resolved.source,
        });
        if (withCoordinates) location = withCoordinates;
      } else {
        location = resolved;
      }
      if (requestVersion !== locationRequestRef.current) return;
      setCurrentLocation(location);
      setCurrentCenter(center);
    } catch (reason) {
      if (requestVersion !== locationRequestRef.current) return;
      setLocationError(reason instanceof Error ? reason.message : '当前位置暂时不可用');
      setCurrentCenter(null);
      setMapLoading(false);
    }
  }, []);

  const loadPoints = useCallback(async (location: CurrentLocation, center: MapCenter) => {
    const requestVersion = ++pointsRequestRef.current;
    const city = location.city?.trim() || currentLocationCityLabel(location).trim();
    if (!city || city === '选择城市') {
      setPointsError('请先选择要查看的城市');
      return;
    }
    setPointsLoading(true);
    setPointsError('');
    try {
      const rows = await serviceMapPoints(city, center);
      if (requestVersion !== pointsRequestRef.current) return;
      pointsRef.current = rows;
      setPoints(rows);
      setSelected((value) => rows.find((row) => row.pointKey === value?.pointKey) ?? null);
    } catch (reason) {
      if (requestVersion !== pointsRequestRef.current) return;
      pointsRef.current = [];
      setPoints([]);
      setSelected(null);
      setPointsError(reason instanceof Error ? reason.message : '附近服务点暂时无法加载');
    } finally {
      if (requestVersion === pointsRequestRef.current) setPointsLoading(false);
    }
  }, []);

  const switchCityFromViewport = useCallback(async (center: MapCenter) => {
    const requestVersion = ++viewportRegionRequestRef.current;
    try {
      const region = await mapReverse(center);
      if (requestVersion !== viewportRegionRequestRef.current) return;
      const city = region.city?.trim();
      if (!city) return;
      const previous = loadCurrentLocation();
      if (previous?.city?.trim() === city) return;
      const saved = saveCurrentLocation({
        label: city,
        city,
        district: region.district?.trim() || undefined,
        latitude: center.latitude,
        longitude: center.longitude,
        source: 'MANUAL',
      });
      if (!saved) return;
      notifyCurrentLocationChanged();
    } catch {
      // Moving the map must remain smooth if reverse geocoding is temporarily unavailable.
    }
  }, []);

  const scheduleViewportCitySwitch = useCallback((center: MapCenter) => {
    if (viewportRegionTimerRef.current !== null) {
      window.clearTimeout(viewportRegionTimerRef.current);
    }
    viewportRegionTimerRef.current = window.setTimeout(() => {
      viewportRegionTimerRef.current = null;
      void switchCityFromViewport(center);
    }, 350);
  }, [switchCityFromViewport]);

  const initialize = useCallback(async () => {
    setMapLoading(true);
    setMapError('');
    try {
      const config = await browserMapConfig();
      const loadedApi = await loadTencentMapSdk(config.key, config.version);
      setApi(loadedApi);
    } catch (reason) {
      setMapError(reason instanceof Error ? reason.message : '腾讯地图暂时无法加载');
      setMapLoading(false);
    }
  }, []);

  useEffect(() => {
    void initialize();
    void resolveLocation();
    const refresh = () => void resolveLocation(loadCurrentLocation());
    window.addEventListener(CURRENT_LOCATION_CHANGED_EVENT, refresh);
    return () => {
      locationRequestRef.current += 1;
      pointsRequestRef.current += 1;
      viewportRegionRequestRef.current += 1;
      if (viewportRegionTimerRef.current !== null) {
        window.clearTimeout(viewportRegionTimerRef.current);
        viewportRegionTimerRef.current = null;
      }
      window.removeEventListener(CURRENT_LOCATION_CHANGED_EVENT, refresh);
    };
  }, [initialize, resolveLocation]);

  const mapReady = Boolean(api && currentCenter);

  useEffect(() => {
    if (!api || !currentCenter || !containerRef.current || mapRef.current) return undefined;
    apiRef.current = api;
    const map = new api.Map(containerRef.current, {
      center: new api.LatLng(currentCenter.latitude, currentCenter.longitude),
      zoom: 12,
      pitch: 0,
      rotation: 0,
      viewMode: '2D',
      showControl: false,
    });
    const stylesById = Object.fromEntries(filterEntries.flatMap((entry) => [
      [entry.key, new api.MarkerStyle({
        width: 44,
        height: 52,
        anchor: { x: 22, y: 50 },
        src: markerSvg(entry.color, entry.shortLabel),
      })],
      [`${entry.key}_ACTIVE`, new api.MarkerStyle({
        width: 44,
        height: 52,
        anchor: { x: 22, y: 50 },
        src: markerSvg(entry.color, entry.shortLabel, false, true),
      })],
    ]));
    const markers = new api.MultiMarker({ map, styles: stylesById, geometries: [] });
    const currentMarker = new api.MultiMarker({
      map,
      styles: {
        CURRENT: new api.MarkerStyle({
          width: 38,
          height: 38,
          anchor: { x: 19, y: 19 },
          src: markerSvg('#ff6b1a', '', true),
        }),
      },
      geometries: [{
        id: 'current-location',
        styleId: 'CURRENT',
        position: new api.LatLng(currentCenter.latitude, currentCenter.longitude),
      }],
    });
    const markerClick = (event: TencentMapEvent) => {
      const pointKey = event.geometry?.properties?.pointKey;
      if (!pointKey) return;
      setSelected(pointsRef.current.find((point) => point.pointKey === pointKey) ?? null);
    };
    const viewportChanged = () => {
      const value = map.getCenter();
      const nextCenter = { latitude: value.getLat(), longitude: value.getLng() };
      scheduleViewportCitySwitch(nextCenter);
    };
    markers.on('click', markerClick);
    map.on('dragend', viewportChanged);
    mapRef.current = map;
    markerLayerRef.current = markers;
    currentMarkerRef.current = currentMarker;
    setMapLoading(false);
    return () => {
      markers.off('click', markerClick);
      map.off('dragend', viewportChanged);
      markers.setMap(null);
      currentMarker.setMap(null);
      map.destroy();
      mapRef.current = null;
      markerLayerRef.current = null;
      currentMarkerRef.current = null;
    };
  }, [api, mapReady, scheduleViewportCitySwitch]);

  useEffect(() => {
    if (!currentCenter || !apiRef.current || !mapRef.current) return;
    mapRef.current.setCenter(
      new apiRef.current.LatLng(currentCenter.latitude, currentCenter.longitude),
    );
    currentMarkerRef.current?.setGeometries([{
      id: 'current-location',
      styleId: 'CURRENT',
      position: new apiRef.current.LatLng(currentCenter.latitude, currentCenter.longitude),
    }]);
    if (currentLocation) void loadPoints(currentLocation, currentCenter);
  }, [currentCenter, currentLocation, loadPoints, mapReady]);

  const visiblePoints = useMemo(
    () => points.filter((point) => enabledFilters.has(pointFilter(point))),
    [enabledFilters, points],
  );

  useEffect(() => {
    if (!markerLayerRef.current || !apiRef.current) return;
    markerLayerRef.current.setGeometries(visiblePoints.map((point) => ({
      id: point.pointKey,
      styleId: selected?.pointKey === point.pointKey
        ? `${pointFilter(point)}_ACTIVE`
        : pointFilter(point),
      position: new apiRef.current!.LatLng(point.latitude, point.longitude),
      properties: { pointKey: point.pointKey },
    })));
    if (selected && !visiblePoints.some((point) => point.pointKey === selected.pointKey)) setSelected(null);
  }, [selected, visiblePoints]);

  const toggleFilter = (key: FilterKey) => {
    setEnabledFilters((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showAllFilters = () => {
    setEnabledFilters(new Set(filterEntries.map((entry) => entry.key)));
  };

  const recenter = () => {
    if (!currentCenter || !mapRef.current || !apiRef.current) return;
    mapRef.current.setCenter(new apiRef.current.LatLng(currentCenter.latitude, currentCenter.longitude));
  };

  const changeZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(4, Math.min(19, Math.round(map.getZoom() + delta))));
  };

  const selectFromList = (point: ServiceMapPoint) => {
    setSelected(point);
    if (mapRef.current && apiRef.current) {
      mapRef.current.setCenter(new apiRef.current.LatLng(point.latitude, point.longitude));
    }
  };

  return (
    <section className={styles.serviceMapSection} aria-labelledby="service-map-title">
      <header className={styles.serviceMapHeader}>
        <div>
          <h2 id="service-map-title">服务地图</h2>
          <p>发现真实内容与入驻商家。</p>
        </div>
      </header>

      <div className={styles.serviceMapLegend} aria-label="地图内容筛选">
        {filterEntries.map((entry) => {
          const enabled = enabledFilters.has(entry.key);
          return (
            <button
              type="button"
              key={entry.key}
              className={enabled ? styles.serviceMapLegendActive : ''}
              aria-pressed={enabled}
              onClick={() => toggleFilter(entry.key)}
            >
              <MapMarkerGlyph entry={entry} />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.serviceMapFrame}>
        <div ref={containerRef} className={styles.serviceMapCanvas} aria-label="腾讯地图服务点位" />
        {mapLoading && !mapError && !locationError && (
          <div className={styles.serviceMapLoading} role="status"><Spin /><span>正在加载地图</span></div>
        )}
        {(mapError || locationError) && (
          <div className={styles.serviceMapFailure}>
            <EnvironmentOutlined />
            <strong>{mapError ? '地图暂时无法加载' : '还没有可用的地图中心'}</strong>
            <p>{mapError || locationError}</p>
            <div>
              <Button icon={<ReloadOutlined />} onClick={() => mapError ? void initialize() : void resolveLocation(loadCurrentLocation(), true)}>重试</Button>
            </div>
          </div>
        )}
        {!mapError && currentCenter && (
          <div className={styles.serviceMapControls}>
            <button type="button" onClick={() => changeZoom(1)} aria-label="放大地图">+</button>
            <button type="button" onClick={() => changeZoom(-1)} aria-label="缩小地图">−</button>
            <button type="button" onClick={recenter} aria-label="回到当前位置"><AimOutlined /></button>
          </div>
        )}
        {!mapError && currentLocation && currentCenter && pointsError && (
          <button type="button" className={styles.serviceMapSearchArea} onClick={() => void loadPoints(currentLocation, currentCenter)} disabled={pointsLoading}>
            <ReloadOutlined /> 重新加载当前城市
          </button>
        )}
        {selected && (
          <article className={styles.serviceMapPopup} aria-live="polite">
            {selected.coverUrl ? (
              <img src={selected.coverUrl} alt="" />
            ) : (
              <span className={styles.serviceMapPopupIcon}>
                <MapMarkerGlyph entry={filterByKey[pointFilter(selected)]} />
              </span>
            )}
            <div>
              <small>{filterByKey[pointFilter(selected)].label}</small>
              <strong>{selected.title}</strong>
              <p>{selected.summary || selected.address}</p>
              <em>{pointMeta(selected)}</em>
            </div>
            <button type="button" className={styles.serviceMapPopupClose} onClick={() => setSelected(null)} aria-label="关闭地点卡片"><CloseOutlined /></button>
            <button type="button" className={styles.serviceMapPopupAction} onClick={() => navigate(pointPath(selected))}>
              {selected.sourceType === 'MERCHANT' ? '查看商品与甄客验' : '查看详情'}
            </button>
          </article>
        )}
      </div>

      {currentLocation && (
        <div className={styles.serviceMapSummary}>
          <span>
            {pointsLoading
              ? '正在更新点位'
              : visiblePoints.length === points.length
                ? `当前城市发现 ${points.length} 个服务点`
                : `当前城市共 ${points.length} 个，已显示 ${visiblePoints.length} 个`}
          </span>
        </div>
      )}
      {!pointsLoading && !pointsError && points.length > 0 && visiblePoints.length === 0 && (
        <div className={styles.serviceMapFilteredEmpty} role="status">
          <span>当前分类都已隐藏</span>
          <button type="button" onClick={showAllFilters}>显示全部</button>
        </div>
      )}
      {!pointsLoading && !pointsError && points.length === 0 && currentLocation && (
        <div className={styles.serviceMapFilteredEmpty} role="status">
          <span>当前城市暂无服务点</span>
        </div>
      )}
      {visiblePoints.length > 0 && (
        <div className={styles.serviceMapPointRail} aria-label="当前城市服务点列表">
          {visiblePoints.slice(0, 10).map((point) => (
            <button
              type="button"
              key={point.pointKey}
              className={selected?.pointKey === point.pointKey ? styles.serviceMapPointActive : ''}
              aria-current={selected?.pointKey === point.pointKey ? 'true' : undefined}
              onClick={() => selectFromList(point)}
            >
              <MapMarkerGlyph entry={filterByKey[pointFilter(point)]} />
              <strong>{point.title}</strong>
              <small>{pointMeta(point)}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
