export type WeixinJsBridgeResult = { err_msg?: string };

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (
        name: string,
        params: Record<string, string>,
        callback: (result: WeixinJsBridgeResult) => void,
      ) => void;
    };
  }
}

export function invokeWechatJsapi(params: Record<string, string>) {
  return new Promise<WeixinJsBridgeResult>((resolve, reject) => {
    const invoke = () => {
      if (!window.WeixinJSBridge) {
        reject(new Error('当前微信版本无法调起支付，请升级微信后重试'));
        return;
      }
      window.WeixinJSBridge.invoke('getBrandWCPayRequest', params, resolve);
    };
    if (window.WeixinJSBridge) {
      invoke();
      return;
    }
    document.addEventListener('WeixinJSBridgeReady', invoke, { once: true });
    window.setTimeout(() => {
      if (!window.WeixinJSBridge) reject(new Error('微信支付组件加载超时，请重试'));
    }, 8000);
  });
}

export function clearWechatPaymentQuery() {
  const url = new URL(window.location.href);
  ['code', 'state', 'wechatPayOrderId', 'wechatPayReturn'].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
