import { requestApi, type ApiResponse } from './apiClient';

export interface WechatJsSdkSignature {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}

export async function fetchWechatJsSdkSignature(url: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ url });
  const result = await requestApi<ApiResponse<WechatJsSdkSignature>>(
    `/shop/wechat/js-sdk/signature?${params.toString()}`,
    { signal },
  );
  if (!result.data) throw new Error('微信分享签名加载失败');
  return result.data;
}
