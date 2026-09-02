import { isSharedContentEntry } from '@/utils/wechatEntryUrl';

export type CurrentLocationSource = 'DEVICE' | 'MANUAL';

type DeviceCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export interface CurrentLocation {
  label: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  source: CurrentLocationSource;
  updatedAt: number;
}

const STORAGE_KEY = 'zhenkexing.current-location';
export const CURRENT_LOCATION_CHANGED_EVENT = 'zhenke:city-changed';

let volatileLocation: CurrentLocation | null = null;
let deviceLocationRequest: Promise<CurrentLocation> | null = null;

function validCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function normalize(value: unknown): CurrentLocation | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CurrentLocation>;
  if (typeof candidate.label !== 'string' || candidate.label.trim().length < 2) return null;
  if (candidate.source !== 'DEVICE' && candidate.source !== 'MANUAL') return null;
  if (typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt)) return null;
  if (candidate.latitude !== undefined && !validCoordinate(candidate.latitude, -90, 90)) return null;
  if (candidate.longitude !== undefined && !validCoordinate(candidate.longitude, -180, 180)) return null;
  return {
    label: candidate.label.trim(),
    city: candidate.city?.trim() || undefined,
    district: candidate.district?.trim() || undefined,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    source: candidate.source,
    updatedAt: candidate.updatedAt,
  };
}

export function loadCurrentLocation() {
  if (typeof window === 'undefined') return volatileLocation;
  try {
    const stored = normalize(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null'));
    if (stored) volatileLocation = stored;
    return stored ?? volatileLocation;
  } catch {
    return volatileLocation;
  }
}

export function saveCurrentLocation(location: Omit<CurrentLocation, 'updatedAt'>) {
  const normalized = normalize({ ...location, updatedAt: Date.now() });
  if (!normalized || typeof window === 'undefined') return null;
  volatileLocation = normalized;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Some embedded browsers disable sessionStorage. Keep the location in
    // memory so the current document can still display and use it.
  }
  return normalized;
}

export function currentLocationCityLabel(location = loadCurrentLocation()) {
  if (!location) return '选择城市';
  if (location.city) return location.city;
  return location.label.split('·')[0]?.trim() || '选择城市';
}

export function notifyCurrentLocationChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CURRENT_LOCATION_CHANGED_EVENT));
  }
}

function geolocationErrorMessage(error: GeolocationPositionError | DOMException | unknown) {
  if (error instanceof Error && [
    '未获得定位权限，请手动选择城市',
    '当前浏览器不支持设备定位，请手动选择城市',
    '设备定位暂时不可用，请手动选择城市',
  ].includes(error.message)) {
    return error.message;
  }
  if (typeof error === 'object' && error && 'code' in error && error.code === 1) {
    return '未获得定位权限，请手动选择城市';
  }
  if (error instanceof DOMException
    && (error.name === 'SecurityError' || error.name === 'NotAllowedError')) {
    return '未获得定位权限，请手动选择城市';
  }
  return '设备定位暂时不可用，请手动选择城市';
}

function browserCoordinates(): Promise<DeviceCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('当前浏览器不支持设备定位，请手动选择城市'));
      return;
    }
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      callback();
    };
    // Some embedded WebViews ignore the native timeout option and never call
    // either callback. Keep the shared request recoverable in that case.
    const watchdog = window.setTimeout(
      () => finish(() => reject(new Error('设备定位暂时不可用，请手动选择城市'))),
      9000,
    );
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => finish(() => resolve(coords)),
        (error) => finish(() => reject(new Error(geolocationErrorMessage(error)))),
        { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false },
      );
    } catch (error) {
      // A few embedded WebViews throw synchronously instead of invoking the
      // error callback. Turning that into a rejection prevents a React effect
      // from tearing down the whole page.
      finish(() => reject(new Error(geolocationErrorMessage(error))));
    }
  });
}

async function deviceCoordinates() {
  const wechatBrowser = typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);
  const wechatCoordinates = async () => {
    const { getWechatCurrentCoordinates } = await import('@/hooks/useWechatShare');
    return getWechatCurrentCoordinates();
  };
  if (wechatBrowser && isSharedContentEntry()) {
    try {
      return await wechatCoordinates();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') throw error;
      // A missing/temporarily unavailable JS-SDK must not make positioning
      // worse than an ordinary browser. Fall back to the standards API.
    }
    return browserCoordinates();
  }
  try {
    return await browserCoordinates();
  } catch (error) {
    if (!wechatBrowser
      || (error instanceof Error && error.message === '未获得定位权限，请手动选择城市')) {
      throw error;
    }
    // Normal in-app navigation starts with the standards API so configuring
    // wx on the homepage does not force a later Android SPA reload. WeChat is
    // the fallback when the embedded browser cannot provide coordinates.
    return wechatCoordinates();
  }
}

async function resolveDeviceLocation() {
  const startedAt = Date.now();
  let coords: DeviceCoordinates;
  try {
    coords = await deviceCoordinates();
  } catch (error) {
    throw new Error(geolocationErrorMessage(error));
  }
  let response: Response;
  let payload: { code?: number; msg?: string; data?: { city?: string; district?: string } };
  const reverseController = new AbortController();
  const reverseTimeout = window.setTimeout(() => reverseController.abort(), 8000);
  try {
    response = await fetch(
      `/api/shop/zhenke/map/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}`,
      { signal: reverseController.signal },
    );
    payload = await response.json();
  } catch {
    throw new Error('地图服务暂时不可用，请手动选择城市');
  } finally {
    window.clearTimeout(reverseTimeout);
  }
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.msg || '地图服务暂时不可用，请手动选择城市');
  }

  const city = payload.data?.city?.trim() || undefined;
  const district = payload.data?.district?.trim() || undefined;
  const existing = loadCurrentLocation();
  // A manual choice made while device positioning was in flight is newer and
  // must not be overwritten by a late reverse-geocoding response.
  if (existing?.source === 'MANUAL' && existing.updatedAt >= startedAt) return existing;

  const saved = saveCurrentLocation({
    label: city || district || '已定位',
    city,
    district,
    latitude: coords.latitude,
    longitude: coords.longitude,
    source: 'DEVICE',
  });
  if (!saved) throw new Error('定位结果暂时无法保存，请手动选择城市');
  notifyCurrentLocationChanged();
  return saved;
}

export function ensureCurrentLocation({ force = false }: { force?: boolean } = {}) {
  const existing = loadCurrentLocation();
  if (!force && existing) return Promise.resolve(existing);
  if (deviceLocationRequest) return deviceLocationRequest;

  const request = resolveDeviceLocation().finally(() => {
    if (deviceLocationRequest === request) deviceLocationRequest = null;
  });
  deviceLocationRequest = request;
  return request;
}
