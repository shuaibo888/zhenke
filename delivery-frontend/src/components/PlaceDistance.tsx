import { useEffect, useState } from 'react';
import { mapRegionCenter, type MapCenter } from '@/services/zhenke';
import { CURRENT_LOCATION_CHANGED_EVENT, loadCurrentLocation } from '@/utils/currentLocation';
import { deviceToMapCoordinates, distanceKm, formatDistance, hasCoordinates } from '@/utils/placeDistance';
import styles from './PlaceDistance.module.less';

// All visible cards share one city lookup, including older sessions without coordinates.
const cityCenters = new Map<string, Promise<MapCenter>>();
function cityCenter(city: string) {
  let request = cityCenters.get(city);
  if (!request) {
    request = mapRegionCenter(city);
    cityCenters.set(city, request);
    void request.catch(() => { cityCenters.delete(city); });
  }
  return request;
}

export function PlaceDistance({ latitude, longitude }: {
  latitude?: number; longitude?: number;
}) {
  const [origin, setOrigin] = useState<MapCenter | null>(null);
  useEffect(() => {
    let version = 0;
    const refresh = async () => {
      const current = ++version;
      setOrigin(null);
      const location = loadCurrentLocation();
      if (!location) return;
      try {
        const manual = location.source === 'MANUAL';
        const center = manual
          ? await cityCenter(location.city?.trim() || location.label)
          : hasCoordinates(location) ? deviceToMapCoordinates(location.latitude, location.longitude) : null;
        if (current === version && center && hasCoordinates(center)) setOrigin(center);
      } catch {
        // Keep content usable if positioning or city lookup is unavailable.
      }
    };
    void refresh();
    window.addEventListener(CURRENT_LOCATION_CHANGED_EVENT, refresh);
    return () => { version += 1; window.removeEventListener(CURRENT_LOCATION_CHANGED_EVENT, refresh); };
  }, []);
  const km = origin ? distanceKm(origin, { latitude, longitude }) : null;
  const text = km === null ? '距离暂不可用'
    : `距离${formatDistance(km)}`;
  return <span className={styles.distance} title={km === null ? '请定位或重新选择城市后查看距离' : undefined}>
    {text}
  </span>;
}
