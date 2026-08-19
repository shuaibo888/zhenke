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

export async function openMerchantNavigation(merchant: PublicMerchantDto) {
  const { latitude, longitude } = merchant;
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
    throw new Error('该商家导航坐标不完整');
  }

  if (isWechatBrowser()) {
    try {
      await openWechatLocation({
        latitude,
        longitude,
        name: merchant.shopName,
        address: merchant.storeAddress,
      });
      return;
    } catch {
      window.location.assign(merchantNavigationUrl(merchant.merchantId));
      return;
    }
  }

  const coordinate = `${latitude},${longitude}`;
  const name = encodeURIComponent(merchant.shopName);
  if (isIosDevice()) {
    window.location.href = `https://maps.apple.com/?daddr=${coordinate}&q=${name}&dirflg=d`;
    return;
  }
  if (isAndroidDevice()) {
    window.location.href = `geo:${coordinate}?q=${coordinate}(${name})`;
    return;
  }
  window.location.assign(merchantNavigationUrl(merchant.merchantId));
}
