import { resolveMediaUrlsDeep } from '@/utils/mediaUrl';

const tokenStorageKey = 'zhenke_access_token';

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

export interface TableResponse<T> extends ApiResponse {
  rows: T[];
  total: number;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(tokenStorageKey);
}

export function storeToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(tokenStorageKey, token);
  else window.localStorage.removeItem(tokenStorageKey);
}

export class AuthExpiredError extends Error {
  constructor() {
    super('登录状态已过期，请重新登录');
    this.name = 'AuthExpiredError';
  }
}

type AuthExpiredListener = () => void;
let authExpiredListener: AuthExpiredListener | null = null;

export function registerAuthExpiredHandler(listener: AuthExpiredListener | null) {
  authExpiredListener = listener;
}

export interface RequestApiOptions {
  /** 认证失败时静默处理（不触发登录过期弹窗），用于会话恢复与主动退出 */
  silentAuthExpired?: boolean;
}

export async function requestApi<T extends ApiResponse>(
  path: string,
  init: RequestInit = {},
  authenticated = false,
  options: RequestApiOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = getToken();
    if (!token) throw new Error('登录状态已失效，请重新登录');
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`/api${path}`, { ...init, headers });
  const rawPayload = (await response.json().catch(() => null)) as T | null;
  const payload = rawPayload ? resolveMediaUrlsDeep(rawPayload) : null;
  if (!response.ok || !payload || payload.code !== 200) {
    const authExpired = authenticated && (response.status === 401 || payload?.code === 401);
    if (authExpired) {
      if (!options.silentAuthExpired) authExpiredListener?.();
      throw new AuthExpiredError();
    }
    throw new Error(payload?.msg || '请求失败，请稍后重试');
  }
  return payload;
}
