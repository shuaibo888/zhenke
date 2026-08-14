import { useEffect } from 'react';
import { fetchWechatJsSdkSignature } from '@/services/wechatShare';

const WECHAT_JS_SDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
const WECHAT_JS_APIS = ['updateAppMessageShareData', 'updateTimelineShareData'];

interface WechatShareData {
  title: string;
  description: string;
  link: string;
  imageUrl: string;
}

interface WechatSdk {
  config: (options: {
    debug: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: string[];
  }) => void;
  ready: (callback: () => void) => void;
  updateAppMessageShareData: (data: {
    title: string;
    desc: string;
    link: string;
    imgUrl: string;
  }) => void;
  updateTimelineShareData: (data: {
    title: string;
    link: string;
    imgUrl: string;
  }) => void;
}

declare global {
  interface Window {
    wx?: WechatSdk;
  }
}

let sdkLoadPromise: Promise<WechatSdk> | null = null;

function isWechatBrowser() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);
}

function loadWechatSdk() {
  if (window.wx) return Promise.resolve(window.wx);
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<WechatSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-wechat-js-sdk]');
    const script = existing ?? document.createElement('script');
    const onLoad = () => (window.wx ? resolve(window.wx) : reject(new Error('微信 JS-SDK 加载失败')));
    const onError = () => reject(new Error('微信 JS-SDK 加载失败'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = WECHAT_JS_SDK_URL;
      script.async = true;
      script.dataset.wechatJsSdk = 'true';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    sdkLoadPromise = null;
    throw error;
  });
  return sdkLoadPromise;
}

function absoluteUrl(value: string) {
  return new URL(value, window.location.origin).toString();
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !element;
  const previous = element?.content;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
  return () => {
    if (created) element?.remove();
    else if (element && previous != null) element.content = previous;
  };
}

export function useWechatShare(data: WechatShareData | null) {
  const title = data?.title.trim() ?? '';
  const description = data?.description.trim() ?? '';
  const link = data?.link ?? '';
  const imageUrl = data?.imageUrl ?? '';

  useEffect(() => {
    if (!title || !link || !imageUrl) return undefined;
    const resolvedLink = absoluteUrl(link);
    const resolvedImageUrl = absoluteUrl(imageUrl);
    const previousTitle = document.title;
    document.title = title;
    const restoreMeta = [
      setMeta('meta[name="description"]', 'name', 'description', description),
      setMeta('meta[property="og:title"]', 'property', 'og:title', title),
      setMeta('meta[property="og:description"]', 'property', 'og:description', description),
      setMeta('meta[property="og:image"]', 'property', 'og:image', resolvedImageUrl),
    ];
    let active = true;

    if (isWechatBrowser()) {
      const signatureUrl = window.location.href.split('#')[0];
      void Promise.all([loadWechatSdk(), fetchWechatJsSdkSignature(signatureUrl)])
        .then(([wx, signature]) => {
          if (!active) return;
          wx.config({
            debug: false,
            appId: signature.appId,
            timestamp: signature.timestamp,
            nonceStr: signature.nonceStr,
            signature: signature.signature,
            jsApiList: WECHAT_JS_APIS,
          });
          wx.ready(() => {
            if (!active) return;
            wx.updateAppMessageShareData({
              title,
              desc: description,
              link: resolvedLink,
              imgUrl: resolvedImageUrl,
            });
            wx.updateTimelineShareData({
              title,
              link: resolvedLink,
              imgUrl: resolvedImageUrl,
            });
          });
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
      document.title = previousTitle;
      restoreMeta.forEach((restore) => restore());
    };
  }, [description, imageUrl, link, title]);
}
