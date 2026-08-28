const PLATFORM_MEDIA_PATH_PATTERN = /^\/profile\/(?:upload|avatar)\/[^/?#]+(?:\/[^/?#]+)*$/;
const API_PLATFORM_MEDIA_PATH_PATTERN = /^\/api(\/profile\/(?:upload|avatar)\/[^/?#]+(?:\/[^/?#]+)*)$/;
const ENCODED_PATH_SEPARATOR_OR_DOT = /%(?:2e|2f|5c)/i;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function normalizePlatformMediaPath(value: string) {
  const path = value.trim();
  if (
    !PLATFORM_MEDIA_PATH_PATTERN.test(path)
    || path.includes('\\')
    || ENCODED_PATH_SEPARATOR_OR_DOT.test(path)
    || CONTROL_CHARACTERS.test(path)
    || path.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    return null;
  }
  return path;
}

/**
 * Extracts the canonical path stored by the platform from either a relative
 * media path or a platform URL returned by an older upload response.
 */
export function extractPlatformMediaPath(value?: string | null) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;

  const apiPath = candidate.match(API_PLATFORM_MEDIA_PATH_PATTERN)?.[1];
  if (apiPath) return normalizePlatformMediaPath(apiPath);

  const relativePath = normalizePlatformMediaPath(candidate);
  if (relativePath) return relativePath;

  try {
    const url = new URL(candidate);
    if (
      !['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null;
    }
    const absoluteApiPath = url.pathname.match(API_PLATFORM_MEDIA_PATH_PATTERN)?.[1];
    return normalizePlatformMediaPath(absoluteApiPath ?? url.pathname);
  } catch {
    return null;
  }
}

/** Maps stored platform paths to the current frontend's API origin for display. */
export function mediaPreviewUrl(value?: string | null) {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  if (!candidate) return '';
  if (/^https?:\/\//i.test(candidate)) return candidate;
  const apiPath = candidate.match(API_PLATFORM_MEDIA_PATH_PATTERN)?.[1];
  if (apiPath) {
    const path = normalizePlatformMediaPath(apiPath);
    return path ? `/api${path}` : '';
  }
  if (/^\/api\/profile\/(?:upload|avatar)\//.test(candidate)) return '';
  const path = normalizePlatformMediaPath(candidate);
  if (/^\/profile\/(?:upload|avatar)\//.test(candidate) && !path) return '';
  return path ? `/api${path}` : candidate;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Normalizes media fields in JSON responses without touching routes such as
 * `/profile` or `/profile/orders`.
 */
export function resolveMediaUrlsDeep<T>(value: T): T {
  if (typeof value === 'string') return mediaPreviewUrl(value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => resolveMediaUrlsDeep(item)) as T;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveMediaUrlsDeep(item)]),
    ) as T;
  }
  return value;
}
