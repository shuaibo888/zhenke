function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

export function isPreviewModeAllowed(environment: string | undefined, rawUrl: string) {
  if (environment !== 'development') return false;

  const url = new URL(rawUrl);
  const localHost = url.hostname === 'localhost' || isPrivateIpv4(url.hostname);
  return localHost && url.searchParams.get('preview') === '1';
}

export function isLocalPreviewMode() {
  return typeof window !== 'undefined'
    && isPreviewModeAllowed(process.env.NODE_ENV, window.location.href);
}
