export type CurrentLocationSource = 'DEVICE' | 'MANUAL';

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
  if (typeof error === 'object' && error && 'code' in error && error.code === 1) {
    return '未获得定位权限，请手动选择城市';
  }
  if (error instanceof DOMException && error.name === 'SecurityError') {
    return '未获得定位权限，请手动选择城市';
  }
  return '设备定位暂时不可用，请手动选择城市';
}

function browserCoordinates() {
  return new Promise<GeolocationCoordinates>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('当前浏览器不支持设备定位，请手动选择城市'));
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve(coords),
        (error) => reject(new Error(geolocationErrorMessage(error))),
        { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false },
      );
    } catch (error) {
      // A few embedded WebViews throw synchronously instead of invoking the
      // error callback. Turning that into a rejection prevents a React effect
      // from tearing down the whole page.
      reject(new Error(geolocationErrorMessage(error)));
    }
  });
}

async function resolveDeviceLocation() {
  const startedAt = Date.now();
  const coords = await browserCoordinates();
  let response: Response;
  try {
    response = await fetch(
      `/api/shop/zhenke/map/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}`,
    );
  } catch {
    throw new Error('地图服务暂时不可用，请手动选择城市');
  }

  let payload: { code?: number; msg?: string; data?: { city?: string; district?: string } };
  try {
    payload = await response.json();
  } catch {
    throw new Error('地图服务暂时不可用，请手动选择城市');
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
