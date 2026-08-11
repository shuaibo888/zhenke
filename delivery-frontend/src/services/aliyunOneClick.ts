import {
  fetchOneClickTokens,
  fetchPhoneAuthCapabilities,
} from './shopAuth';

interface OneClickResult {
  code: string | number;
  spToken?: string;
  msg?: string;
  requestId?: string;
  vender?: string;
  content?: unknown;
}

interface PhoneNumberServerInstance {
  checkLoginAvailable(options: {
    accessToken: string;
    jwtToken: string;
    timeout?: number;
    success: (result: OneClickResult) => void;
    error: (result: OneClickResult) => void;
  }): void;
  getLoginToken(options: {
    timeout?: number;
    authPageOption?: Record<string, unknown>;
    success: (result: OneClickResult) => void;
    error: (result: OneClickResult) => void;
    watch?: () => void;
  }): void;
  getConnection?: () => 'wifi' | 'cellular' | 'unknown';
  closeLoginPage?: () => void;
}

declare global {
  interface Window {
    PhoneNumberServer?: new () => PhoneNumberServerInstance;
  }
}

let sdkLoading: Promise<void> | null = null;

function loadSdk(sdkUrl: string) {
  if (window.PhoneNumberServer) return Promise.resolve();
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => window.PhoneNumberServer
      ? resolve()
      : reject(new Error('一键认证 SDK 加载不完整'));
    script.onerror = () => reject(new Error('一键认证 SDK 加载失败，请使用短信验证码'));
    document.head.appendChild(script);
  }).catch((error) => {
    sdkLoading = null;
    throw error;
  });
  return sdkLoading;
}

const sdkErrorGuidance: Record<string, string> = {
  '600004': '认证方案无效',
  '600011': '请关闭WiFi使用手机流量认证或使用短信验证码',
  '600025': '认证方案校验失败',
  '600028': '认证参数无效',
  '600030': '认证页面配置不完整',
  '600032': '认证业务类型错误',
  '600034': '认证凭证已过期',
};

function sdkError(result: OneClickResult, fallback: string) {
  const code = String(result?.code ?? '').trim();
  const message = sdkErrorGuidance[code] || result?.msg?.trim() || fallback;
  console.warn('Aliyun H5 one-click authentication failed', {
    code,
    message: result?.msg,
    requestId: result?.requestId,
    vender: result?.vender,
    content: result?.content,
  });
  return new Error(code && code !== '600011' ? `${message}（错误码 ${code}）` : message);
}

function ensureSuccess(result: OneClickResult, fallback: string) {
  if (String(result.code) !== '600000') throw sdkError(result, fallback);
}

export async function getAliyunOneClickSpToken() {
  const capabilities = await fetchPhoneAuthCapabilities();
  if (!capabilities.oneClickEnabled) throw new Error('当前未启用 H5 一键认证，请使用短信验证码');
  await loadSdk(capabilities.sdkUrl);
  const Constructor = window.PhoneNumberServer;
  if (!Constructor) throw new Error('一键认证 SDK 未就绪');
  const server = new Constructor();
  if (server.getConnection?.() === 'wifi') {
    throw new Error('请关闭WiFi使用手机流量认证或使用短信验证码');
  }
  const tokens = await fetchOneClickTokens();
  return new Promise<string>((resolve, reject) => {
    const getLoginToken = () => {
      server.getLoginToken({
        timeout: 25,
        authPageOption: {
          navText: '手机号认证',
          btnText: '确认登录/注册',
          privacyBefore: '我已阅读并同意',
          agreeSymbol: '、',
          isFocus: true,
          isDialog: true,
          manualClose: false,
        },
        success: (result) => {
          try {
            ensureSuccess(result, '一键认证失败');
            if (!result.spToken) throw new Error('一键认证凭证缺失');
            server.closeLoginPage?.();
            resolve(result.spToken);
          } catch (error) {
            server.closeLoginPage?.();
            reject(error);
          }
        },
        error: (result) => {
          server.closeLoginPage?.();
          reject(sdkError(result, '一键认证失败，请使用短信验证码'));
        },
      });
    };

    server.checkLoginAvailable({
      ...tokens,
      timeout: 10,
      success: (result) => {
        try {
          ensureSuccess(result, '当前网络不支持一键认证');
          getLoginToken();
        } catch (error) {
          reject(error);
        }
      },
      error: (result) => reject(sdkError(result, '当前网络不支持一键认证')),
    });
  });
}
