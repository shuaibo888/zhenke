declare global {
  interface Window {
    __DELIVERY_WECHAT_ENTRY_URL__?: string;
  }
}

function withoutHash(value: string) {
  return value.split('#')[0];
}

export function captureWechatEntryUrl() {
  if (typeof window === 'undefined') return '';
  if (!window.__DELIVERY_WECHAT_ENTRY_URL__) {
    window.__DELIVERY_WECHAT_ENTRY_URL__ = withoutHash(window.location.href);
  }
  return window.__DELIVERY_WECHAT_ENTRY_URL__;
}

export function getWechatJsSdkSignatureUrls() {
  const currentUrl = withoutHash(window.location.href);
  const entryUrl = captureWechatEntryUrl();
  const userAgent = navigator.userAgent;
  const isWechatIos = /MicroMessenger/i.test(userAgent) && /iPhone|iPad|iPod/i.test(userAgent);
  // WeChat iOS keeps the first document URL for the lifetime of an SPA
  // WebView. Android signs the URL currently displayed by the document.
  // Do not fall through to the opposite platform rule: a second config with a
  // different URL can invalidate share data that was already registered.
  return [isWechatIos ? entryUrl : currentUrl];
}
