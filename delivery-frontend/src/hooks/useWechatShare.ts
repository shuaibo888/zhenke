import { useCallback, useEffect, useRef } from 'react';
import { fetchWechatJsSdkSignature } from '@/services/wechatShare';
import { getWechatJsSdkSignatureUrls } from '@/utils/wechatEntryUrl';

const WECHAT_JS_SDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
const WECHAT_SHARE_JS_APIS = [
  'updateAppMessageShareData',
  'updateTimelineShareData',
  'onMenuShareAppMessage',
  'onMenuShareTimeline',
];
const WECHAT_LOCATION_JS_APIS = ['openLocation'];

interface WechatShareData {
  title: string;
  description: string;
  link: string;
  imageUrl: string;
}

interface PreparedWechatShareData extends WechatShareData {
  key: string;
}

export interface WechatLocationData {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
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
  error: (callback: (error: { errMsg?: string }) => void) => void;
  updateAppMessageShareData?: (data: {
    title: string;
    desc: string;
    link: string;
    imgUrl: string;
    success: () => void;
    fail: (error: { errMsg?: string }) => void;
  }) => void;
  updateTimelineShareData?: (data: {
    title: string;
    link: string;
    imgUrl: string;
    success: () => void;
    fail: (error: { errMsg?: string }) => void;
  }) => void;
  onMenuShareAppMessage?: (data: {
    title: string;
    desc: string;
    link: string;
    imgUrl: string;
    type: 'link';
    dataUrl: string;
    success?: () => void;
    cancel?: () => void;
    fail?: (error: { errMsg?: string }) => void;
  }) => void;
  onMenuShareTimeline?: (data: {
    title: string;
    link: string;
    imgUrl: string;
    success?: () => void;
    cancel?: () => void;
    fail?: (error: { errMsg?: string }) => void;
  }) => void;
  openLocation: (data: WechatLocationData & {
    scale: number;
    success: () => void;
    cancel: () => void;
    fail: (error: { errMsg?: string }) => void;
  }) => void;
}

declare global {
  interface Window {
    wx?: WechatSdk;
  }
}

let sdkLoadPromise: Promise<WechatSdk> | null = null;
let wxConfigQueue: Promise<void> = Promise.resolve();

export function isWechatBrowser() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);
}

function loadWechatSdk() {
  if (window.wx) return Promise.resolve(window.wx);
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<WechatSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-wechat-js-sdk]');
    existing?.remove();
    const script = document.createElement('script');
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error('微信 JS-SDK 加载失败'));
    };
    const onLoad = () => {
      if (!window.wx) {
        fail();
        return;
      }
      cleanup();
      resolve(window.wx);
    };
    const onError = () => fail();
    const timeout = window.setTimeout(fail, 6000);
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    script.src = WECHAT_JS_SDK_URL;
    script.async = true;
    script.dataset.wechatJsSdk = 'true';
    document.head.appendChild(script);
  }).catch((error) => {
    sdkLoadPromise = null;
    throw error;
  });
  return sdkLoadPromise;
}

function absoluteUrl(value: string) {
  const url = new URL(value, window.location.origin);
  if (
    window.location.protocol === 'https:'
    && url.protocol === 'http:'
    && url.host === window.location.host
  ) {
    url.protocol = 'https:';
  }
  return url.toString();
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

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function enqueueWechatConfig(task: () => Promise<void>) {
  const result = wxConfigQueue.catch(() => undefined).then(task);
  wxConfigQueue = result.catch(() => undefined);
  return result;
}

function signatureAttemptUrls() {
  const urls = getWechatJsSdkSignatureUrls();
  return urls.length === 1 ? [urls[0], urls[0]] : [urls[0], urls[1], urls[0]];
}

function applyWechatLocationConfig(
  wx: WechatSdk,
  signature: Awaited<ReturnType<typeof fetchWechatJsSdkSignature>>,
  location: WechatLocationData,
) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const fail = (error: unknown) => finish(() => reject(
      error instanceof Error ? error : new Error('微信地点预览打开失败'),
    ));
    const timeout = window.setTimeout(() => fail(new Error('微信地点预览打开超时')), 6000);

    wx.config({
      debug: false,
      appId: signature.appId,
      timestamp: signature.timestamp,
      nonceStr: signature.nonceStr,
      signature: signature.signature,
      jsApiList: WECHAT_LOCATION_JS_APIS,
    });
    wx.ready(() => {
      if (settled) return;
      wx.openLocation({
        ...location,
        scale: 18,
        success: () => finish(resolve),
        cancel: () => finish(resolve),
        fail: (error) => fail(new Error(error.errMsg || '微信地点预览打开失败')),
      });
    });
    wx.error((error) => fail(new Error(error.errMsg || '微信地点预览配置失败')));
  });
}

export async function openWechatLocation(location: WechatLocationData) {
  if (!isWechatBrowser()) throw new Error('当前不是微信浏览器');
  const attempts = signatureAttemptUrls();
  let lastError: unknown = new Error('微信地点预览打开失败');
  for (let index = 0; index < attempts.length; index += 1) {
    try {
      const [wx, signature] = await Promise.all([
        loadWechatSdk(),
        fetchWechatJsSdkSignature(attempts[index]),
      ]);
      await enqueueWechatConfig(() => applyWechatLocationConfig(wx, signature, location));
      return;
    } catch (error) {
      lastError = error;
      if (index < attempts.length - 1) await delay(250 * (index + 1));
    }
  }
  throw lastError;
}

function applyWechatShareConfig(
  wx: WechatSdk,
  signature: Awaited<ReturnType<typeof fetchWechatJsSdkSignature>>,
  data: PreparedWechatShareData,
  isCurrent: () => boolean,
) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const fail = (error: unknown) => finish(() => reject(
      error instanceof Error ? error : new Error('微信分享卡片配置失败'),
    ));
    const timeout = window.setTimeout(() => fail(new Error('微信分享卡片配置超时')), 6000);

    wx.config({
      debug: false,
      appId: signature.appId,
      timestamp: signature.timestamp,
      nonceStr: signature.nonceStr,
      signature: signature.signature,
      jsApiList: WECHAT_SHARE_JS_APIS,
    });
    wx.ready(() => {
      if (settled) return;
      if (!isCurrent()) {
        fail(new Error('分享页面已经切换'));
        return;
      }
      try {
        // Keep the legacy menu handlers registered as a compatibility fallback.
        // Their success callback only runs after a user actually shares, so the
        // registration itself must not be awaited here.
        wx.onMenuShareAppMessage?.({
          title: data.title,
          desc: data.description,
          link: data.link,
          imgUrl: data.imageUrl,
          type: 'link',
          dataUrl: '',
        });
        wx.onMenuShareTimeline?.({
          title: data.title,
          link: data.link,
          imgUrl: data.imageUrl,
        });
      } catch (error) {
        fail(error);
        return;
      }

      const registrations: Promise<void>[] = [];
      if (wx.updateAppMessageShareData) {
        registrations.push(new Promise<void>((resolveUpdate, rejectUpdate) => {
          wx.updateAppMessageShareData?.({
            title: data.title,
            desc: data.description,
            link: data.link,
            imgUrl: data.imageUrl,
            success: resolveUpdate,
            fail: (error) => rejectUpdate(new Error(error.errMsg || '微信好友分享卡片配置失败')),
          });
        }));
      }
      if (wx.updateTimelineShareData) {
        registrations.push(new Promise<void>((resolveUpdate, rejectUpdate) => {
          wx.updateTimelineShareData?.({
            title: data.title,
            link: data.link,
            imgUrl: data.imageUrl,
            success: resolveUpdate,
            fail: (error) => rejectUpdate(new Error(error.errMsg || '微信朋友圈分享卡片配置失败')),
          });
        }));
      }

      const friendShareAvailable = Boolean(
        wx.updateAppMessageShareData || wx.onMenuShareAppMessage,
      );
      const timelineShareAvailable = Boolean(
        wx.updateTimelineShareData || wx.onMenuShareTimeline,
      );
      if (!friendShareAvailable || !timelineShareAvailable) {
        fail(new Error('当前微信版本不支持分享卡片接口，请升级微信后重试'));
        return;
      }

      void Promise.all(registrations).then(
        () => finish(resolve),
        fail,
      );
    });
    wx.error((error) => fail(new Error(error.errMsg || '微信分享配置失败')));
  });
}

export function getWechatShareErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message.trim() : '';
  return detail
    ? `微信分享卡片准备失败：${detail}`
    : '微信分享卡片准备失败，请刷新页面后重试';
}

async function configureWechatShare(data: PreparedWechatShareData, isCurrent: () => boolean) {
  const attemptUrls = signatureAttemptUrls();
  let lastError: unknown = new Error('微信分享卡片配置失败');

  for (let index = 0; index < attemptUrls.length; index += 1) {
    if (!isCurrent()) throw new Error('分享页面已经切换');
    try {
      const [wx, signature] = await Promise.all([
        loadWechatSdk(),
        fetchWechatJsSdkSignature(attemptUrls[index]),
      ]);
      await enqueueWechatConfig(() => applyWechatShareConfig(wx, signature, data, isCurrent));
      return;
    } catch (error) {
      lastError = error;
      if (!isCurrent()) throw error;
      if (index < attemptUrls.length - 1) await delay(250 * (index + 1));
    }
  }
  throw lastError;
}

export function useWechatShare(data: WechatShareData | null) {
  const title = data?.title.trim() ?? '';
  const description = data?.description.trim() ?? '';
  const link = data?.link ?? '';
  const imageUrl = data?.imageUrl ?? '';
  const mountedRef = useRef(false);
  const latestShareRef = useRef<PreparedWechatShareData | null>(null);
  const setupRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const preparedData = title && link && imageUrl ? {
    title,
    description,
    link: absoluteUrl(link),
    imageUrl: absoluteUrl(imageUrl),
    key: JSON.stringify([title, description, link, imageUrl]),
  } : null;
  latestShareRef.current = preparedData;

  const prepareWechatShare = useCallback(() => {
    const current = latestShareRef.current;
    if (!isWechatBrowser() || !current) {
      return Promise.reject(new Error('微信分享卡片尚未准备'));
    }
    if (setupRef.current?.key === current.key) return setupRef.current.promise;

    const { key } = current;
    const isCurrent = () => mountedRef.current && latestShareRef.current?.key === key;
    const promise = configureWechatShare(current, isCurrent).catch((error) => {
      if (setupRef.current?.promise === promise) setupRef.current = null;
      throw error;
    });
    setupRef.current = { key, promise };
    return promise;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!title || !link || !imageUrl) return undefined;
    const previousTitle = document.title;
    document.title = title;
    const restoreMeta = [
      setMeta('meta[name="description"]', 'name', 'description', description),
      setMeta('meta[property="og:title"]', 'property', 'og:title', title),
      setMeta('meta[property="og:description"]', 'property', 'og:description', description),
      setMeta('meta[property="og:image"]', 'property', 'og:image', absoluteUrl(imageUrl)),
    ];
    if (isWechatBrowser()) void prepareWechatShare().catch(() => undefined);

    return () => {
      document.title = previousTitle;
      restoreMeta.forEach((restore) => restore());
    };
  }, [description, imageUrl, link, prepareWechatShare, title]);

  return prepareWechatShare;
}
