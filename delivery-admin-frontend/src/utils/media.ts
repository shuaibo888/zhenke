const PLATFORM_MEDIA_PREFIXES = ['/profile/upload/', '/profile/avatar/'] as const;

function platformMediaPath(value: string) {
  const normalized = value.trim().replace(/\\/g, '/');
  if (!normalized || normalized.includes('..')) return '';

  const withoutApiPrefix = normalized.startsWith('/api/profile/')
    ? normalized.slice('/api'.length)
    : normalized;
  if (PLATFORM_MEDIA_PREFIXES.some((prefix) => withoutApiPrefix.startsWith(prefix))) {
    return withoutApiPrefix;
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)
        || parsed.username || parsed.password || parsed.search || parsed.hash) return '';
    const pathname = parsed.pathname.startsWith('/api/profile/')
      ? parsed.pathname.slice('/api'.length)
      : parsed.pathname;
    return PLATFORM_MEDIA_PREFIXES.some((prefix) => pathname.startsWith(prefix))
      ? pathname
      : '';
  } catch {
    return '';
  }
}

/** Canonical value submitted to the API and persisted by the platform. */
export function mediaStoragePath(value?: string | null) {
  if (!value) return '';
  return platformMediaPath(value) || value.trim();
}

/** Browser-safe preview URL for a canonical platform media path. */
export function mediaPreviewUrl(value?: string | null) {
  if (!value) return '';
  const path = platformMediaPath(value);
  return path ? `/api${path}` : value.trim();
}

type UploadPayload = {
  path?: string;
  fileName?: string;
  url?: string;
};

/** Prefer the platform-relative path and fall back to normalizing a legacy URL. */
export function uploadedMediaPath(payload?: UploadPayload | null) {
  const candidate = payload?.path || payload?.fileName || payload?.url;
  const path = candidate ? platformMediaPath(candidate) : '';
  if (!path) throw new Error('上传成功，但未返回可保存的媒体路径');
  return path;
}

export const MAX_ADMIN_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateJpegPngImage(file: File, label = '图片') {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error(`${label}仅支持 JPG、PNG 格式`);
  }
  if (file.size > MAX_ADMIN_IMAGE_SIZE) {
    throw new Error(`${label}不能超过 5MB`);
  }
}
