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
  if (typeof window === 'undefined') return null;
  try {
    return normalize(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

export function saveCurrentLocation(location: Omit<CurrentLocation, 'updatedAt'>) {
  const normalized = normalize({ ...location, updatedAt: Date.now() });
  if (!normalized || typeof window === 'undefined') return null;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
