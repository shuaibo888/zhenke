function toAbsoluteUrl(value: string) {
  const url = new URL(value, window.location.origin);
  if (
    window.location.protocol === 'https:'
    && url.protocol === 'http:'
    && url.host === window.location.host
  ) {
    url.protocol = 'https:';
  }
  return url;
}

function positiveInteger(value: string | null) {
  return value && /^[1-9]\d*$/.test(value) ? value : '';
}

function contentRoute(url: URL) {
  return url.pathname.match(
    /^\/(?:api\/shop\/wechat\/share\/)?(posts|products|reports|enjoy)\/([1-9]\d*)\/?$/,
  );
}

/**
 * Keeps the public content route as the share target. Nginx serves the
 * server-rendered metadata response for the initial request, while recipients
 * continue into the SPA on the same stable URL.
 */
export function buildWechatShareCardLink(value: string) {
  const canonical = toAbsoluteUrl(value);
  canonical.hash = '';
  if (canonical.origin !== window.location.origin) return canonical.toString();

  const match = contentRoute(canonical);
  if (!match) return canonical.toString();

  const [, kind, id] = match;
  const endpoint = new URL(`/${kind}/${id}`, canonical.origin);
  if (kind === 'products') {
    const campaign = positiveInteger(canonical.searchParams.get('campaign'));
    if (campaign) endpoint.searchParams.set('campaign', campaign);
  }
  return endpoint.toString();
}

/** Uses the content endpoint that returns a public, square, lightweight JPEG. */
export function buildWechatShareCardImage(value: string, cardLink: string) {
  const link = toAbsoluteUrl(cardLink);
  const match = contentRoute(link);
  if (!match || link.origin !== window.location.origin) {
    return value ? toAbsoluteUrl(value).toString() : '';
  }

  const [, kind, id] = match;
  const endpoint = new URL(`/api/shop/wechat/share/${kind}/${id}/image`, link.origin);
  const campaign = positiveInteger(link.searchParams.get('campaign'));
  if (kind === 'products' && campaign) endpoint.searchParams.set('campaign', campaign);
  return endpoint.toString();
}
