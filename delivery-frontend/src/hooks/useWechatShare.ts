import { useCallback, useEffect, useRef } from 'react';
import { fetchWechatJsSdkSignature } from '@/services/wechatShare';
import { getWechatJsSdkSignatureUrls } from '@/utils/wechatEntryUrl';
import {
  buildWechatShareCardImage,
  buildWechatShareCardLink,
} from '@/utils/wechatShareUrl';

const WECHAT_JS_SDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
const WECHAT_JS_APIS = [
  'checkJsApi',
  'updateAppMessageShareData',
  'updateTimelineShareData',
  'onMenuShareAppMessage',
  'onMenuShareTimeline',
  'openLocation',
];

interface WechatShareData {
  title: string;
  description: string;
  link: string;
  imageUrl: string;
}

interface PreparedWechatShareData extends WechatShareData {
  key: string;
}

interface WechatShareCapabilities {
  modernFriend: boolean;
  modernTimeline: boolean;
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
  checkJsApi?: (data: {
    jsApiList: string[];
    success: (result: {
      checkResult?: Record<string, boolean | string>;
    }) => void;
    fail: (error: { errMsg?: string }) => void;
  }) => void;
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
    dataUrl: '';
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
let wxConfigState: { url: string; promise: Promise<WechatSdk> } | null = null;
const wxShareCapabilityState = new WeakMap<WechatSdk, Promise<WechatShareCapabilities>>();

export function isWechatBrowser() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);
}

function isWechatIos() {
  return isWechatBrowser() && /iPhone|iPad|iPod/i.test(navigator.userAgent);
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

function enqueueWechatConfig<T>(task: () => Promise<T>) {
  const result = wxConfigQueue.catch(() => undefined).then(task);
  wxConfigQueue = result.then(() => undefined, () => undefined);
  return result;
}

function signatureAttemptUrls() {
  const [signatureUrl] = getWechatJsSdkSignatureUrls();
  return [signatureUrl, signatureUrl];
}

function applyWechatSdkConfig(
  wx: WechatSdk,
  signature: Awaited<ReturnType<typeof fetchWechatJsSdkSignature>>,
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
      error instanceof Error ? error : new Error('微信 JS-SDK 配置失败'),
    ));
    const timeout = window.setTimeout(() => fail(new Error('微信 JS-SDK 配置超时')), 10000);

    wx.error((error) => fail(new Error(error.errMsg || '微信 JS-SDK 配置失败')));
    wx.config({
      debug: false,
      appId: signature.appId,
      timestamp: signature.timestamp,
      nonceStr: signature.nonceStr,
      signature: signature.signature,
      jsApiList: WECHAT_JS_APIS,
    });
    // Follow the official sequence: config first, then invoke capabilities in
    // ready. Registering ready before a second SPA config can consume the
    // previous page's ready state and falsely report success.
    wx.ready(() => {
      finish(resolve);
    });
  });
}

function ensureWechatSdkConfigured(signatureUrl: string) {
  if (wxConfigState?.url === signatureUrl) return wxConfigState.promise;
  if (wxConfigState && !isWechatIos()) {
    // jweixin 1.6.0 keeps its previous ready state when wx.config is called a
    // second time. Android must sign the current SPA URL, so start a fresh
    // document when that URL changes instead of accepting a stale ready event.
    window.location.reload();
    return new Promise<WechatSdk>(() => undefined);
  }
  const promise = enqueueWechatConfig(async () => {
    const [wx, signature] = await Promise.all([
      loadWechatSdk(),
      fetchWechatJsSdkSignature(signatureUrl),
    ]);
    await applyWechatSdkConfig(wx, signature);
    return wx;
  });
  const state = { url: signatureUrl, promise };
  wxConfigState = state;
  void promise.catch(() => {
    if (wxConfigState === state) wxConfigState = null;
  });
  return promise;
}

function checkedApi(value: boolean | string | undefined) {
  return value === true || value === 'true';
}

function resolveWechatShareCapabilities(wx: WechatSdk) {
  const existing = wxShareCapabilityState.get(wx);
  if (existing) return existing;

  const promise = new Promise<WechatShareCapabilities>((resolve, reject) => {
    if (!wx.checkJsApi) {
      resolve({ modernFriend: false, modernTimeline: false });
      return;
    }
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const timeout = window.setTimeout(
      () => finish(() => reject(new Error('微信分享能力检测超时'))),
      6000,
    );
    wx.checkJsApi({
      jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
      success: (result) => finish(() => resolve({
        modernFriend: checkedApi(result.checkResult?.updateAppMessageShareData),
        modernTimeline: checkedApi(result.checkResult?.updateTimelineShareData),
      })),
      fail: (error) => finish(() => reject(
        new Error(error.errMsg || '微信分享能力检测失败'),
      )),
    });
  });
  wxShareCapabilityState.set(wx, promise);
  void promise.catch(() => wxShareCapabilityState.delete(wx));
  return promise;
}

function invokeWechatLocation(wx: WechatSdk, location: WechatLocationData) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('微信地点预览打开超时')), 6000);
    const finish = (callback: () => void) => {
      window.clearTimeout(timeout);
      callback();
    };
    wx.openLocation({
      ...location,
      scale: 18,
      success: () => finish(resolve),
      cancel: () => finish(resolve),
      fail: (error) => finish(() => reject(new Error(error.errMsg || '微信地点预览打开失败'))),
    });
  });
}

export async function openWechatLocation(location: WechatLocationData) {
  if (!isWechatBrowser()) throw new Error('当前不是微信浏览器');
  const attempts = signatureAttemptUrls();
  let lastError: unknown = new Error('微信地点预览打开失败');
  for (let index = 0; index < attempts.length; index += 1) {
    try {
      const wx = await ensureWechatSdkConfigured(attempts[index]);
      await invokeWechatLocation(wx, location);
      return;
    } catch (error) {
      lastError = error;
      if (index < attempts.length - 1) await delay(250 * (index + 1));
    }
  }
  throw lastError;
}

async function registerWechatShareData(
  wx: WechatSdk,
  data: PreparedWechatShareData,
  isCurrent: () => boolean,
) {
  if (!isCurrent()) return Promise.reject(new Error('分享页面已经切换'));
  const capabilities = await resolveWechatShareCapabilities(wx);
  if (!isCurrent()) return Promise.reject(new Error('分享页面已经切换'));
  const friendShareAvailable = Boolean(
    (capabilities.modernFriend && wx.updateAppMessageShareData) || wx.onMenuShareAppMessage,
  );
  const timelineShareAvailable = Boolean(
    (capabilities.modernTimeline && wx.updateTimelineShareData) || wx.onMenuShareTimeline,
  );
  if (!friendShareAvailable || !timelineShareAvailable) {
    return Promise.reject(new Error('微信客户端未开放好友或朋友圈卡片接口'));
  }

  const useModernFriendShare = capabilities.modernFriend && Boolean(wx.updateAppMessageShareData);
  const useModernTimelineShare = capabilities.modernTimeline && Boolean(wx.updateTimelineShareData);

  try {
    // Deprecated menu handlers can override data already registered through
    // update* on current iOS WeChat. Only install them when the corresponding
    // modern API is genuinely unavailable on an old client.
    if (!useModernFriendShare) {
      wx.onMenuShareAppMessage?.({
        title: data.title,
        desc: data.description,
        link: data.link,
        imgUrl: data.imageUrl,
        type: 'link',
        dataUrl: '',
      });
    }
    if (!useModernTimelineShare) {
      wx.onMenuShareTimeline?.({
        title: data.title,
        link: data.link,
        imgUrl: data.imageUrl,
      });
    }
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error('微信分享卡片配置失败'));
  }

  const registrations: Promise<void>[] = [];
  if (useModernFriendShare) {
    registrations.push(new Promise<void>((resolveUpdate, rejectUpdate) => {
      const timeout = window.setTimeout(
        () => rejectUpdate(new Error('微信好友分享卡片配置超时')),
        6000,
      );
      const finish = (callback: () => void) => {
        window.clearTimeout(timeout);
        callback();
      };
      wx.updateAppMessageShareData?.({
        title: data.title,
        desc: data.description,
        link: data.link,
        imgUrl: data.imageUrl,
        success: () => finish(resolveUpdate),
        fail: (error) => finish(() => rejectUpdate(
          new Error(error.errMsg || '微信好友分享卡片配置失败'),
        )),
      });
    }));
  }
  if (useModernTimelineShare) {
    registrations.push(new Promise<void>((resolveUpdate, rejectUpdate) => {
      const timeout = window.setTimeout(
        () => rejectUpdate(new Error('微信朋友圈分享卡片配置超时')),
        6000,
      );
      const finish = (callback: () => void) => {
        window.clearTimeout(timeout);
        callback();
      };
      wx.updateTimelineShareData?.({
        title: data.title,
        link: data.link,
        imgUrl: data.imageUrl,
        success: () => finish(resolveUpdate),
        fail: (error) => finish(() => rejectUpdate(
          new Error(error.errMsg || '微信朋友圈分享卡片配置失败'),
        )),
      });
    }));
  }
  return Promise.all(registrations).then(() => undefined);
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
      const wx = await ensureWechatSdkConfigured(attemptUrls[index]);
      await registerWechatShareData(wx, data, isCurrent);
      return wx;
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
  const configuredRef = useRef<{ key: string; wx: WechatSdk } | null>(null);
  const resolvedLink = title && link ? buildWechatShareCardLink(link) : '';
  const resolvedImageUrl = title && resolvedLink
    ? buildWechatShareCardImage(imageUrl, resolvedLink)
    : '';
  const preparedData = title && resolvedLink && resolvedImageUrl ? {
    title,
    description,
    link: resolvedLink,
    imageUrl: resolvedImageUrl,
    key: JSON.stringify([title, description, resolvedLink, resolvedImageUrl]),
  } : null;
  latestShareRef.current = preparedData;

  const prepareWechatShare = useCallback((forceRegistration = false) => {
    const current = latestShareRef.current;
    if (!isWechatBrowser() || !current) {
      return Promise.reject(new Error('微信分享卡片尚未准备'));
    }
    const { key } = current;
    const isCurrent = () => mountedRef.current && latestShareRef.current?.key === key;
    if (forceRegistration && configuredRef.current?.key === key) {
      // The page share button is a real user gesture. Re-register the modern
      // APIs from that click instead of only trusting setup done during load.
      return registerWechatShareData(configuredRef.current.wx, current, isCurrent);
    }
    if (setupRef.current?.key === current.key) return setupRef.current.promise;

    const promise = configureWechatShare(current, isCurrent)
      .then((wx) => {
        if (isCurrent()) configuredRef.current = { key, wx };
      })
      .catch((error) => {
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
      configuredRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!title || !resolvedLink || !resolvedImageUrl) return undefined;
    const previousTitle = document.title;
    document.title = title;
    const restoreMeta = [
      setMeta('meta[name="description"]', 'name', 'description', description),
      setMeta('meta[property="og:title"]', 'property', 'og:title', title),
      setMeta('meta[property="og:description"]', 'property', 'og:description', description),
      setMeta('meta[property="og:url"]', 'property', 'og:url', resolvedLink),
      setMeta('meta[property="og:image"]', 'property', 'og:image', resolvedImageUrl),
    ];
    if (isWechatBrowser()) void prepareWechatShare().catch(() => undefined);

    return () => {
      document.title = previousTitle;
      restoreMeta.forEach((restore) => restore());
    };
  }, [description, imageUrl, link, prepareWechatShare, resolvedImageUrl, resolvedLink, title]);

  return prepareWechatShare;
}
