import { isWechatBrowser, openWechatLocation } from '@/hooks/useWechatShare';
import {
  merchantNavigationUrl,
  type PublicMerchantDto,
} from '@/services/shopContent';

function validCoordinate(value: number, minimum: number, maximum: number) {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

export interface NavigationTarget {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export async function openCoordinateNavigation(target: NavigationTarget, fallbackUrl: string) {
  const { latitude, longitude } = target;
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    throw new Error('导航坐标不完整');
  }

  if (isWechatBrowser()) {
    try {
      await openWechatLocation({
        latitude,
        longitude,
        name: target.name,
        address: target.address,
      });
      return;
    } catch {
      window.location.assign(fallbackUrl);
      return;
    }
  }

  const coordinate = `${latitude},${longitude}`;
  const name = encodeURIComponent(target.name);
  if (isIosDevice()) {
    window.location.href = `https://maps.apple.com/?daddr=${coordinate}&q=${name}&dirflg=d`;
    return;
  }
  if (isAndroidDevice()) {
    window.location.href = `geo:${coordinate}?q=${coordinate}(${name})`;
    return;
  }
  window.location.assign(fallbackUrl);
}

export async function openMerchantNavigation(merchant: PublicMerchantDto) {
  return openCoordinateNavigation({
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    name: merchant.shopName,
    address: merchant.storeAddress,
  }, merchantNavigationUrl(merchant.merchantId));
}

export async function openPlaceNavigation(placeId: number, target: NavigationTarget) {
  return openCoordinateNavigation(target, `/api/shop/zhenke/places/${placeId}/navigation`);
}
