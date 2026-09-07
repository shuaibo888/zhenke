type Coordinates = { latitude?: number; longitude?: number };

export function hasCoordinates(point: Coordinates | null | undefined): point is { latitude: number; longitude: number } {
  return typeof point?.latitude === 'number' && Number.isFinite(point.latitude)
    && Math.abs(point.latitude) <= 90
    && typeof point.longitude === 'number' && Number.isFinite(point.longitude)
    && Math.abs(point.longitude) <= 180;
}

// Browser and WeChat device fixes are WGS84; stored Tencent POIs are GCJ02.
export function deviceToMapCoordinates(latitude: number, longitude: number) {
  if (longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271) {
    return { latitude, longitude };
  }
  const x = longitude - 105;
  const y = latitude - 35;
  const pi = Math.PI;
  const wave = (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3;
  let latOffset = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x)) + wave;
  latOffset += (20 * Math.sin(y * pi) + 40 * Math.sin(y / 3 * pi)) * 2 / 3;
  latOffset += (160 * Math.sin(y / 12 * pi) + 320 * Math.sin(y * pi / 30)) * 2 / 3;
  let lngOffset = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x)) + wave;
  lngOffset += (20 * Math.sin(x * pi) + 40 * Math.sin(x / 3 * pi)) * 2 / 3;
  lngOffset += (150 * Math.sin(x / 12 * pi) + 300 * Math.sin(x / 30 * pi)) * 2 / 3;
  const rad = latitude / 180 * pi;
  const magic = 1 - 0.00669342162296594323 * Math.sin(rad) ** 2;
  const root = Math.sqrt(magic);
  return {
    latitude: latitude + latOffset * 180 / ((6378245 * (1 - 0.00669342162296594323)) / (magic * root) * pi),
    longitude: longitude + lngOffset * 180 / (6378245 / root * Math.cos(rad) * pi),
  };
}

export function distanceKm(from: Coordinates, to: Coordinates): number | null {
  if (!hasCoordinates(from) || !hasCoordinates(to)) return null;
  const rad = Math.PI / 180;
  const a = Math.sin((to.latitude - from.latitude) * rad / 2) ** 2
    + Math.cos(from.latitude * rad) * Math.cos(to.latitude * rad)
    * Math.sin((to.longitude - from.longitude) * rad / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

export function formatDistance(km: number) {
  if (km < 0.1) return '不足100米';
  if (km < 1) return `约${Math.round(km * 100) * 10}米`;
  return `约${km < 100 ? Number(km.toFixed(1)) : Math.round(km)}公里`;
}
