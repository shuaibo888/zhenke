export function safeInternalRedirect(value: string | null | undefined, fallback = '/') {
  const target = value?.trim();
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
    return fallback;
  }
  try {
    const internalOrigin = 'https://zhenkexing.local';
    const resolved = new URL(target, internalOrigin);
    if (resolved.origin !== internalOrigin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function buildLoginPath(returnPath: string) {
  return `/auth?redirect=${encodeURIComponent(safeInternalRedirect(returnPath))}`;
}

export const LOGIN_RETURN_TO_SOURCE_STATE = { returnToSource: true } as const;
